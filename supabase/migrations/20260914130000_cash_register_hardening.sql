-- Endurecimiento de las RPCs de caja (migración 20260914120100) y del índice de sesión
-- abierta (KNOWN_ISSUES #32):
--   1. app_settings: tope de apertura configurable sin tocar código (seed 1,000,000).
--   2. open_cash_register: valida el tope con código CASH_INVALID_AMOUNT.
--   3. _cash_session_payload: columnas explícitas (no to_jsonb de toda la fila).
--   4. _cash_already_open_response: deduplica la respuesta de "caja ya abierta".
--   5. Índice único parcial de una sesión abierta por sucursal (garantiza el catch de
--      unique_violation y evita dos aperturas concurrentes).
--
-- No se editan las migraciones ya aplicadas al remoto: todo va por CREATE OR REPLACE /
-- CREATE TABLE IF NOT EXISTS.

-- 1. Configuración de la aplicación ----------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id)
);

alter table public.app_settings enable row level security;

-- Solo el backend con rol elevado (SECURITY DEFINER / service_role) lee y escribe. Las RPCs
-- de abajo corren como owner (postgres) y por eso bypassan RLS. Los grants de lectura/escritura
-- para el futuro panel de configuración se agregan cuando exista (KNOWN_ISSUES #33).
revoke all on table public.app_settings from anon, authenticated;

insert into public.app_settings (key, value, description)
values (
  'cash_register.max_opening_amount',
  '1000000'::jsonb,
  'Tope de efectivo inicial permitido al abrir caja (configurable desde el panel).'
)
on conflict (key) do nothing;

-- Helper privado: tope vigente con fallback seguro si el valor es inválido o no existe.
create or replace function public._cash_max_opening_amount()
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_raw text;
  v_cap numeric;
begin
  select (value #>> '{}')
    into v_raw
  from public.app_settings
  where key = 'cash_register.max_opening_amount';

  if v_raw is null then
    return 1000000;
  end if;

  begin
    v_cap := v_raw::numeric;
  exception when others then
    return 1000000;
  end;

  if v_cap is null or v_cap < 0 then
    return 1000000;
  end if;

  return v_cap;
end;
$$;

revoke all on function public._cash_max_opening_amount() from public;

-- 2. Payload con columnas explícitas ---------------------------------------------------
create or replace function public._cash_session_payload(p_session public.cash_register_sessions)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  if p_session.id is null then
    return null;
  end if;

  if p_session.user_id is not null then
    select username into v_username from public.users where id = p_session.user_id;
  end if;

  return jsonb_build_object(
    'id', p_session.id,
    'user_id', p_session.user_id,
    'branch_id', p_session.branch_id,
    'opening_amount', p_session.opening_amount,
    'closing_amount', p_session.closing_amount,
    'difference', p_session.difference,
    'status', p_session.status,
    'opened_at', p_session.opened_at,
    'closed_at', p_session.closed_at,
    'username', v_username,
    'user', case when v_username is null then null
                 else jsonb_build_object('id', p_session.user_id, 'username', v_username) end,
    'users', case when v_username is null then null
                  else jsonb_build_object('id', p_session.user_id, 'username', v_username) end
  );
end;
$$;

revoke all on function public._cash_session_payload(public.cash_register_sessions) from public;

-- 3. Respuesta deduplicada de "caja ya abierta" ----------------------------------------
create or replace function public._cash_already_open_response(
  p_session public.cash_register_sessions,
  p_current_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  if p_session.user_id is not null then
    select username into v_username from public.users where id = p_session.user_id;
  end if;

  return jsonb_build_object(
    'success', false,
    'session', public._cash_session_payload(p_session),
    'code', case when p_session.user_id = p_current_user_id
                 then 'CASH_ALREADY_OPEN_BY_SAME_USER'
                 else 'CASH_ALREADY_OPEN_BY_OTHER_USER' end,
    'message', case when p_session.user_id = p_current_user_id
                    then 'Ya tienes una caja abierta en esta sucursal.'
                    else 'Ya existe una caja abierta en esta sucursal por '
                         || upper(coalesce(v_username, 'OTRO USUARIO'))
                         || '. Debe cerrarse antes de abrir otra caja.' end
  );
end;
$$;

revoke all on function public._cash_already_open_response(public.cash_register_sessions, uuid) from public;

-- 4. open_cash_register con tope configurable y respuesta deduplicada -------------------
create or replace function public.open_cash_register(p_branch_id uuid, p_opening_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.cash_register_sessions%rowtype;
  v_amount numeric := coalesce(p_opening_amount, 0);
  v_cap numeric := public._cash_max_opening_amount();
  v_new public.cash_register_sessions%rowtype;
begin
  if p_branch_id is null then
    return jsonb_build_object('success', false, 'message', 'branchId requerido');
  end if;

  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'userId requerido');
  end if;

  if v_amount < 0 then
    return jsonb_build_object(
      'success', false,
      'code', 'CASH_INVALID_AMOUNT',
      'message', 'openingAmount inválido'
    );
  end if;

  if v_amount > v_cap then
    return jsonb_build_object(
      'success', false,
      'code', 'CASH_INVALID_AMOUNT',
      'message', 'El monto de apertura no puede superar ' || v_cap::text || '.'
    );
  end if;

  select *
    into v_session
  from public.cash_register_sessions
  where branch_id = p_branch_id
    and status = 'open'
  order by opened_at desc
  limit 1;

  if v_session.id is not null then
    return public._cash_already_open_response(v_session, v_user_id);
  end if;

  insert into public.cash_register_sessions (branch_id, user_id, opening_amount, opened_at, status)
  values (p_branch_id, v_user_id, v_amount, now(), 'open')
  returning * into v_new;

  return jsonb_build_object('success', true, 'session', public._cash_session_payload(v_new));

exception
  when unique_violation then
    -- Otra transacción abrió la caja en paralelo (índice único por sucursal abierta).
    select *
      into v_session
    from public.cash_register_sessions
    where branch_id = p_branch_id
      and status = 'open'
    order by opened_at desc
    limit 1;

    if v_session.id is null then
      return jsonb_build_object(
        'success', false,
        'code', 'CASH_ALREADY_OPEN',
        'message', 'Ya existe una caja abierta en esta sucursal.'
      );
    end if;

    return public._cash_already_open_response(v_session, v_user_id);
end;
$$;

revoke all on function public.open_cash_register(uuid, numeric) from public;
grant execute on function public.open_cash_register(uuid, numeric) to authenticated;

-- 5. Índice único parcial: una sola caja abierta por sucursal --------------------------
do $$
declare
  v_duplicates int;
  v_has_index boolean;
begin
  select count(*)
    into v_duplicates
  from (
    select branch_id
    from public.cash_register_sessions
    where status = 'open'
    group by branch_id
    having count(*) > 1
  ) d;

  if v_duplicates > 0 then
    raise exception
      'Hay % sucursal(es) con más de una caja abierta; ciérralas antes de crear el índice único.',
      v_duplicates;
  end if;

  select exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'cash_register_sessions'
      and indexdef ilike '%unique%'
      and indexdef ilike '%(branch_id)%'
      and indexdef ilike '%where%'
      and indexdef ilike '%open%'
  ) into v_has_index;

  if v_has_index then
    raise notice 'Ya existe un índice único parcial de caja abierta; no se crea otro.';
  else
    execute
      'create unique index cash_register_sessions_one_open_per_branch_idx '
      'on public.cash_register_sessions (branch_id) where status = ''open''';
  end if;
end;
$$;
