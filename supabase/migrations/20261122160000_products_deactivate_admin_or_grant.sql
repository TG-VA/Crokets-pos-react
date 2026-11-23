-- Desactivar un producto exige administrador o una autorizacion vigente de un administrador.
-- Motivo: Productos > Eliminar (que pone `status = false`) pedia la autorizacion de un
-- administrador solo en la interfaz, y Productos > Modificar, sin proteger, podia guardar el
-- mismo cambio. Cualquier sesion podia hacer `update products set status = false` directo por
-- PostgREST.
-- Un trigger BEFORE UPDATE OF status exige, para las llamadas de la API (rol anon o
-- authenticated en el JWT) que pasan un producto de activo a inactivo, `is_admin()` o una fila
-- vigente en `admin_action_grants` para quien llama con la accion `products_delete_access`.
-- La sucursal no se compara: el catalogo es global. Activar, editar y las conexiones sin JWT
-- (service role, mantenimiento, RPCs llamadas con service role) no cambian.
-- Despliegue: desplegar primero `authorize-admin-action`, que ahora registra esa autorizacion,
-- y publicar el instalador cuya pantalla Modificar la pide al desactivar. Con un instalador
-- anterior, un cajero que desactiva desde Modificar recibe el error de guardado.
-- Rollback:
--   drop trigger products_deactivate_admin_or_grant on public.products;
--   drop function public.products_deactivate_admin_or_grant();

create or replace function public.products_deactivate_admin_or_grant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') then
    return new;
  end if;

  if old.status is distinct from false and new.status = false then
    if v_actor is null then
      raise exception 'Se requiere un usuario autenticado para desactivar productos.'
        using errcode = '42501';
    end if;

    if not public.is_admin()
      and not exists (
        select 1
        from public.admin_action_grants g
        where g.granted_to = v_actor
          and g.action = 'products_delete_access'
          and g.expires_at > now()
      ) then
      raise exception 'Desactivar un producto requiere la autorizacion de un administrador.'
        using errcode = '42501', hint = 'ADMIN_GRANT_REQUIRED';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.products_deactivate_admin_or_grant() from public, anon, authenticated;

drop trigger if exists products_deactivate_admin_or_grant on public.products;

create trigger products_deactivate_admin_or_grant
before update of status on public.products
for each row
execute function public.products_deactivate_admin_or_grant();
