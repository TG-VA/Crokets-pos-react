-- Vincula un dispositivo POS (device_code) a una sucursal existente.
--
-- Cierra el bloqueante de primer arranque: en una PC nueva el device_code generado
-- por electron-store no existe en pos_devices y el login falla con "Este POS no
-- está asignado a ninguna sucursal". El asistente de vinculación del frontend
-- valida a un administrador (edge function authorize-admin-action) y luego llama a
-- esta RPC para registrar el equipo.
--
-- Se ejecuta SIN sesión (la pantalla de login aún no autenticó), por lo que se
-- concede EXECUTE a anon. La elevación de privilegios se contiene validando que
-- p_admin_id sea un usuario activo con rol 'admin'; el device_code es un UUID
-- aleatorio por equipo (no enumerable), igual que en get_branch_by_device.
create or replace function public.register_pos_device(
  p_device_code text,
  p_branch_id uuid,
  p_admin_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch record;
  v_admin_is_valid boolean;
begin
  if p_device_code is null or btrim(p_device_code) = '' then
    return jsonb_build_object(
      'success', false,
      'message', 'deviceCode requerido'
    );
  end if;

  if p_branch_id is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Sucursal requerida'
    );
  end if;

  -- La tabla branches no tiene bandera is_active: una sucursal existe o no. Se
  -- valida la existencia y se devuelve su nombre/código para el frontend.
  select b.id, b.name, b.code
    into v_branch
  from public.branches b
  where b.id = p_branch_id;

  if v_branch.id is null then
    return jsonb_build_object(
      'success', false,
      'message', 'La sucursal no existe'
    );
  end if;

  select true
    into v_admin_is_valid
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = p_admin_id
    and u.status = true
    and r.name = 'admin'
  limit 1;

  if v_admin_is_valid is not true then
    return jsonb_build_object(
      'success', false,
      'message', 'El administrador no es válido'
    );
  end if;

  insert into public.pos_devices (device_code, branch_id, is_active, updated_at)
  values (p_device_code, p_branch_id, true, now())
  on conflict (device_code) do update
    set branch_id = excluded.branch_id,
        is_active = true,
        updated_at = now();

  return jsonb_build_object(
    'success', true,
    'branch', jsonb_build_object(
      'id', v_branch.id,
      'name', v_branch.name,
      'code', v_branch.code
    )
  );
end;
$$;

revoke all on function public.register_pos_device(text, uuid, uuid) from public;
grant execute on function public.register_pos_device(text, uuid, uuid) to anon, authenticated, service_role;
