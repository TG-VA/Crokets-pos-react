-- RPCs de caja para reemplazar los endpoints locales /cash/check y /cash/open de
-- src/backend/server.js (KNOWN_ISSUES #1). Ambos se ejecutan tras el login, por lo que
-- solo se otorgan a authenticated.
--
-- Devuelven el mismo shape JSON que consumía el frontend:
--   { success, session|null, code?, message? }
-- con la sesión enriquecida con username/user/users para resolver el mensaje de dueño.

-- Helper privado: serializa una sesión de caja con el username del dueño en las tres
-- claves que el frontend consulta (username / user.username / users.username). Sin grants
-- directos: solo lo invocan las funciones SECURITY DEFINER de abajo (corren como owner).
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

  return to_jsonb(p_session) || jsonb_build_object(
    'username', v_username,
    'user', case when v_username is null then null
                 else jsonb_build_object('id', p_session.user_id, 'username', v_username) end,
    'users', case when v_username is null then null
                  else jsonb_build_object('id', p_session.user_id, 'username', v_username) end
  );
end;
$$;

revoke all on function public._cash_session_payload(public.cash_register_sessions) from public;

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

create or replace function public.open_cash_register(p_branch_id uuid, p_opening_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.cash_register_sessions%rowtype;
  v_username text;
  v_amount numeric := coalesce(p_opening_amount, 0);
  v_new public.cash_register_sessions%rowtype;
begin
  if p_branch_id is null then
    return jsonb_build_object('success', false, 'message', 'branchId requerido');
  end if;

  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'userId requerido');
  end if;

  if v_amount < 0 then
    return jsonb_build_object('success', false, 'message', 'openingAmount inválido');
  end if;

  select *
    into v_session
  from public.cash_register_sessions
  where branch_id = p_branch_id
    and status = 'open'
  order by opened_at desc
  limit 1;

  if v_session.id is not null then
    if v_session.user_id is not null then
      select username into v_username from public.users where id = v_session.user_id;
    end if;

    return jsonb_build_object(
      'success', false,
      'session', public._cash_session_payload(v_session),
      'code', case when v_session.user_id = v_user_id
                   then 'CASH_ALREADY_OPEN_BY_SAME_USER'
                   else 'CASH_ALREADY_OPEN_BY_OTHER_USER' end,
      'message', case when v_session.user_id = v_user_id
                      then 'Ya tienes una caja abierta en esta sucursal.'
                      else 'Ya existe una caja abierta en esta sucursal por '
                           || upper(coalesce(v_username, 'OTRO USUARIO'))
                           || '. Debe cerrarse antes de abrir otra caja.' end
    );
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

    if v_session.user_id is not null then
      select username into v_username from public.users where id = v_session.user_id;
    end if;

    return jsonb_build_object(
      'success', false,
      'session', public._cash_session_payload(v_session),
      'code', case when v_session.user_id = v_user_id
                   then 'CASH_ALREADY_OPEN_BY_SAME_USER'
                   else 'CASH_ALREADY_OPEN_BY_OTHER_USER' end,
      'message', case when v_session.user_id = v_user_id
                      then 'Ya tienes una caja abierta en esta sucursal.'
                      else 'Ya existe una caja abierta en esta sucursal por '
                           || upper(coalesce(v_username, 'OTRO USUARIO'))
                           || '. Debe cerrarse antes de abrir otra caja.' end
    );
end;
$$;

revoke all on function public.open_cash_register(uuid, numeric) from public;
grant execute on function public.open_cash_register(uuid, numeric) to authenticated;
