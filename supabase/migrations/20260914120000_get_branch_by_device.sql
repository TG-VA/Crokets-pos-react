-- Resuelve la sucursal asignada a un dispositivo POS a partir de su device_code.
-- Reemplaza el endpoint local POST /device/branch de src/backend/server.js para que el
-- frontend deje de depender del servidor Express embebido (KNOWN_ISSUES #1).
--
-- Se ejecuta ANTES del sign-in: Login.jsx resuelve la sucursal para validar la sesión
-- activa del POS antes de autenticar, por lo que requiere EXECUTE para anon. El
-- device_code es un UUID aleatorio por equipo (electron-store), no enumerable; la función
-- es SECURITY DEFINER y solo expone id/nombre/código de la sucursal, nunca la tabla completa.

create or replace function public.get_branch_by_device(p_device_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch record;
begin
  if p_device_code is null or btrim(p_device_code) = '' then
    return jsonb_build_object(
      'success', false,
      'message', 'deviceCode requerido'
    );
  end if;

  select b.id, b.name, b.code
    into v_branch
  from public.pos_devices pd
  join public.branches b on b.id = pd.branch_id
  where pd.device_code = p_device_code
    and pd.is_active = true
  order by pd.id
  limit 1;

  if v_branch.id is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Este POS no está asignado a ninguna sucursal'
    );
  end if;

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

revoke all on function public.get_branch_by_device(text) from public;
grant execute on function public.get_branch_by_device(text) to anon, authenticated;
