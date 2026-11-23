-- Desactivar un cliente exige administrador o una autorizacion vigente de un administrador.
-- Motivo: Clientes > Desactivar y Facturacion > Clientes > Desactivar solo se protegian en la
-- interfaz (AdminAuthorizationModal). Cualquier sesion podia hacer
-- `update customers set status = false` directo por PostgREST.
-- Un trigger BEFORE UPDATE cubre los dos flujos sin cambiar a los clientes: cuando una
-- llamada de la API (rol anon o authenticated en el JWT) cambia `status` de activo a
-- inactivo, exige `is_admin()` o una fila vigente en `admin_action_grants` para quien llama
-- con la accion `customers_deactivate` o `deactivate_fiscal_customer`. La sucursal no se
-- compara: los clientes son globales.
-- Activar, editar y las conexiones sin JWT (service role, mantenimiento) no cambian.
-- Despliegue: desplegar primero `authorize-admin-action`, que ahora registra la
-- autorizacion de esas dos acciones. Sin ella, un cajero autorizado recibe el error.
-- Rollback:
--   drop trigger customers_deactivate_admin_or_grant on public.customers;
--   drop function public.customers_deactivate_admin_or_grant();

create or replace function public.customers_deactivate_admin_or_grant()
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
      raise exception 'Se requiere un usuario autenticado para desactivar clientes.'
        using errcode = '42501';
    end if;

    if not public.is_admin()
      and not exists (
        select 1
        from public.admin_action_grants g
        where g.granted_to = v_actor
          and g.action in ('customers_deactivate', 'deactivate_fiscal_customer')
          and g.expires_at > now()
      ) then
      raise exception 'Desactivar un cliente requiere la autorizacion de un administrador.'
        using errcode = '42501', hint = 'ADMIN_GRANT_REQUIRED';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.customers_deactivate_admin_or_grant() from public, anon, authenticated;

drop trigger if exists customers_deactivate_admin_or_grant on public.customers;

create trigger customers_deactivate_admin_or_grant
before update of status on public.customers
for each row
execute function public.customers_deactivate_admin_or_grant();
