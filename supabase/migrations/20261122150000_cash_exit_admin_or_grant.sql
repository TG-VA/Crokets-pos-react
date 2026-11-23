-- Registrar una salida de efectivo exige administrador o una autorizacion vigente de un
-- administrador.
-- Motivo: Ventas > Salida pedia la autorizacion de un administrador solo en la interfaz
-- (AdminAuthorizationModal con `cash_exit_access`). La politica de insert de
-- `cash_movements` solo exige que la sesion de caja abierta sea del usuario, asi que un
-- cajero podia insertar una `salida` directo por PostgREST.
-- Un trigger BEFORE INSERT exige, para las llamadas de la API (rol anon o authenticated en
-- el JWT) con `movement_type = 'salida'`, `is_admin()` o una fila vigente en
-- `admin_action_grants` para quien llama, la accion `cash_exit_access` y la sucursal del
-- movimiento. Las entradas y las conexiones sin JWT (service role, mantenimiento) no cambian.
-- Despliegue: desplegar primero `authorize-admin-action`, que ahora registra esa
-- autorizacion. Sin ella, un cajero autorizado recibe el error.
-- Rollback:
--   drop trigger cash_exit_admin_or_grant on public.cash_movements;
--   drop function public.cash_exit_admin_or_grant();

create or replace function public.cash_exit_admin_or_grant()
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

  if new.movement_type = 'salida' then
    if v_actor is null then
      raise exception 'Se requiere un usuario autenticado para registrar salidas.'
        using errcode = '42501';
    end if;

    if not public.is_admin()
      and not exists (
        select 1
        from public.admin_action_grants g
        where g.granted_to = v_actor
          and g.action = 'cash_exit_access'
          and g.branch_id = new.branch_id
          and g.expires_at > now()
      ) then
      raise exception 'Registrar una salida requiere la autorizacion de un administrador.'
        using errcode = '42501', hint = 'ADMIN_GRANT_REQUIRED';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.cash_exit_admin_or_grant() from public, anon, authenticated;

drop trigger if exists cash_exit_admin_or_grant on public.cash_movements;

create trigger cash_exit_admin_or_grant
before insert on public.cash_movements
for each row
execute function public.cash_exit_admin_or_grant();
