-- register_pos_device: solo service role.
-- La funcion es SECURITY DEFINER y aceptaba p_admin_id del cliente sin comprobar que ese
-- administrador hubiera autorizado nada: con la clave publica, cualquiera podia vincular
-- un device_code a cualquier sucursal pasando el id de un admin activo. Esto abre el
-- login de esa sucursal desde un equipo ajeno.
-- Ahora la edge function authorize-admin-action valida la contrasena del administrador y
-- llama la RPC con service role (accion register_pos_device con deviceCode). El cliente
-- ya no la ejecuta.
-- Despliegue, en este orden:
--   1. Desplegar authorize-admin-action (compatible con instaladores anteriores: sin
--      deviceCode solo autoriza, como antes).
--   2. Publicar el instalador que manda deviceCode y deja de llamar la RPC.
--   3. Aplicar esta migracion cuando las cajas tengan el instalador nuevo. Antes de eso,
--      un instalador anterior no podria activar un equipo nuevo.
-- Tambien deshace el grant a anon que deja 20261122120000_revoke_anon_grants.sql.
-- Rollback:
--   grant execute on function public.register_pos_device(text, uuid, uuid) to anon, authenticated;

revoke execute on function public.register_pos_device(text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.register_pos_device(text, uuid, uuid) to service_role;
