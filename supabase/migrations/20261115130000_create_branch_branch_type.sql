-- create_branch acepta el tipo de sucursal (p_branch_type, default 'operational').
-- Se elimina la firma de 9 parametros y se crea la de 10 en la misma transaccion: con ambas
-- vivas, PostgREST no podria elegir sobrecarga al llamar con argumentos nombrados. Los
-- instaladores anteriores llaman sin p_branch_type y siguen funcionando por el default.
-- Requiere 20261115120000_branches_branch_type.sql (columna branch_type).
-- Sin cambios en validaciones de admin, unicidad, SECURITY DEFINER, search_path ni grants.
-- Rollback: drop function public.create_branch(text, text, uuid, text, text, text, text, text, text, text);
--   y reaplicar la definicion de 20261020120000_branches_is_active_management.sql.

drop function if exists public.create_branch(text, text, uuid, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_branch(
    p_code text,
    p_name text,
    p_admin_id uuid,
    p_phone text DEFAULT NULL,
    p_email text DEFAULT NULL,
    p_address text DEFAULT NULL,
    p_city text DEFAULT NULL,
    p_state text DEFAULT NULL,
    p_timezone text DEFAULT 'America/Cancun',
    p_branch_type text DEFAULT 'operational'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_admin_is_valid boolean;
  v_admin_id uuid := coalesce(auth.uid(), p_admin_id);
  v_existing record;
  v_branch record;
  v_branch_type text := coalesce(nullif(btrim(coalesce(p_branch_type, '')), ''), 'operational');
begin
  if p_code is null or btrim(p_code) = '' then
    return jsonb_build_object('success', false, 'message', 'El código de la sucursal es obligatorio.');
  end if;

  if p_name is null or btrim(p_name) = '' then
    return jsonb_build_object('success', false, 'message', 'El nombre de la sucursal es obligatorio.');
  end if;

  if v_branch_type not in ('operational', 'admin') then
    return jsonb_build_object('success', false, 'message', 'El tipo de sucursal no es válido.');
  end if;

  select true
    into v_admin_is_valid
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = v_admin_id
    and u.status = true
    and r.name = 'admin'
  limit 1;

  if v_admin_is_valid is not true then
    return jsonb_build_object('success', false, 'message', 'El administrador no es válido.');
  end if;

  select b.id, 'code' as conflict
    into v_existing
  from public.branches b
  where b.code = btrim(p_code)
  limit 1;

  if v_existing.id is not null then
    return jsonb_build_object('success', false, 'message', 'Ya existe una sucursal con ese código.');
  end if;

  select b.id, 'name' as conflict
    into v_existing
  from public.branches b
  where lower(b.name) = lower(btrim(p_name))
  limit 1;

  if v_existing.id is not null then
    return jsonb_build_object('success', false, 'message', 'Ya existe una sucursal con ese nombre.');
  end if;

  insert into public.branches (code, name, phone, email, address, city, state, timezone, is_active, branch_type)
  values (
    btrim(p_code),
    btrim(p_name),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(btrim(coalesce(p_email, '')), ''),
    nullif(btrim(coalesce(p_address, '')), ''),
    nullif(btrim(coalesce(p_city, '')), ''),
    nullif(btrim(coalesce(p_state, '')), ''),
    coalesce(nullif(btrim(coalesce(p_timezone, '')), ''), 'America/Cancun'),
    true,
    v_branch_type
  )
  returning id, code, name, phone, email, address, city, state, timezone, is_active, branch_type
    into v_branch;

  return jsonb_build_object(
    'success', true,
    'message', 'Sucursal creada correctamente.',
    'branch', to_jsonb(v_branch)
  );
end;
$$;

revoke all on function public.create_branch(text, text, uuid, text, text, text, text, text, text, text) from public;
grant execute on function public.create_branch(text, text, uuid, text, text, text, text, text, text, text) to authenticated, service_role;
