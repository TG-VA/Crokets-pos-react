-- Validación de membresía de sucursal en las RPCs de caja (KNOWN_ISSUES #29).
--
-- get_cash_register_session y open_cash_register (migración 20260914120100) son
-- SECURITY DEFINER y reciben p_branch_id del cliente. No verificaban que el usuario
-- autenticado perteneciera a esa sucursal en user_branches, por lo que cualquier sesión
-- con la anon key pública podía consultar o abrir la caja de otra sucursal.
--
-- Se agrega el helper _user_can_access_branch y la validación en ambas RPCs. Un usuario
-- con rol admin (is_admin()) queda exento para poder operar en cualquier sucursal.
--
-- No se edita la migración ya aplicada al remoto: todo va por CREATE OR REPLACE y una
-- función nueva. La base neta de comisiones (#19) y los bordes de #20 no se tocan aquí.

-- Helper privado: membresía activa del usuario autenticado en la sucursal, o admin.
-- SECURITY DEFINER para poder leer user_branches de cualquier usuario; solo lo invocan
-- las RPCs SECURITY DEFINER de abajo (corren como owner).
create or replace function public._user_can_access_branch(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
      or exists (
        select 1
        from public.user_branches ub
        where ub.user_id = auth.uid()
          and ub.branch_id = p_branch_id
          and ub.is_active = true
      );
$$;

revoke all on function public._user_can_access_branch(uuid) from public;

-- get_cash_register_session: valida membresía antes de leer la sesión abierta.
create or replace function public.get_cash_register_session(p_branch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.cash_register_sessions%rowtype;
begin
  if p_branch_id is null then
    return jsonb_build_object('success', false, 'session', null, 'message', 'branchId requerido');
  end if;

  if not public._user_can_access_branch(p_branch_id) then
    raise exception 'No tienes acceso a esta sucursal.'
      using errcode = '42501';
  end if;

  select *
    into v_session
  from public.cash_register_sessions
  where branch_id = p_branch_id
    and status = 'open'
  order by opened_at desc
  limit 1;

  if v_session.id is null then
    return jsonb_build_object('success', true, 'session', null);
  end if;

  return jsonb_build_object(
    'success', true,
    'session', public._cash_session_payload(v_session)
  );
end;
$$;

revoke all on function public.get_cash_register_session(uuid) from public;
grant execute on function public.get_cash_register_session(uuid) to authenticated;

-- open_cash_register: valida membresía antes de validar montos y abrir la sesión.
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

  if not public._user_can_access_branch(p_branch_id) then
    raise exception 'No tienes acceso a esta sucursal.'
      using errcode = '42501';
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
