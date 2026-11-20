-- RPC transaccional para los ajustes de inventario (Inventario > Ajustes).
-- Motivo: el cliente leia `branch_inventory`, hacia update/insert y registraba el
-- movimiento como llamadas sueltas:
-- - El update escribia `cost_price` con el costo del catalogo y borraba el Costo
--   Promedio Ponderado de la sucursal que mantiene `add_inventory_entry`.
-- - Una venta entre la lectura y el update se perdia, y la validacion de stock
--   negativo usaba un dato viejo.
-- - Si fallaba el log, el stock ya habia cambiado sin rastro en el kardex.
-- - Cualquier sesion con acceso a la sucursal podia restar stock sin autorizacion.
-- La funcion exige administrador o una autorizacion vigente de
-- `inventory_adjust_access` en `admin_action_grants` (mismo criterio que
-- `add_inventory_entry`), bloquea la fila (advisory lock + `for update`) y
-- escribe stock y movimiento en una sola transaccion. No toca `cost_price` (el
-- CPP) y deja `unit_cost`/`total_cost` en NULL: son el costo de adquisicion de
-- las entradas (20261002124615) y un ajuste no compra mercancia.
-- Reglas:
-- - La diferencia es un entero distinto de 0.
-- - El producto debe tener fila en `branch_inventory`; el alta se hace en
--   Agregar, que captura el costo. Se rechaza con hint INVENTORY_NOT_REGISTERED.
-- - El stock resultante no puede ser negativo. Se rechaza con hint NEGATIVE_STOCK.
-- - Motivo obligatorio; las notas se anexan como "motivo - notas".
-- - `inventory_movements.created_at` guarda la hora local de la sucursal
--   (`branches.timezone`, fallback 'America/Cancun'), como `add_inventory_entry`.
-- Despliegue: aplicar esta migracion y desplegar `authorize-admin-action` (registra
-- `inventory_adjust_access`) juntos. Sin la edge function, un cajero autorizado
-- recibe el error de autorizacion.
-- Rollback: drop function public.apply_inventory_adjustment(uuid, uuid, numeric, text, text);

create or replace function public.apply_inventory_adjustment(
  p_branch_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_reason text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_row record;
  v_previous numeric;
  v_new_stock numeric;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_notes text := btrim(coalesce(p_notes, ''));
  v_local_now timestamp;
begin
  if v_actor is null and auth.role() <> 'service_role' then
    raise exception 'Se requiere un usuario autenticado para ajustar inventario.';
  end if;

  if p_branch_id is null then
    raise exception 'No hay una sucursal activa para aplicar el ajuste.';
  end if;

  if p_product_id is null then
    raise exception 'No se detectó el identificador del producto.';
  end if;

  if v_actor is not null
    and not public._user_can_access_branch(p_branch_id) then
    raise exception 'No tienes acceso a esta sucursal.'
      using errcode = '42501';
  end if;

  if v_actor is not null
    and not public.is_admin()
    and not exists (
      select 1
      from public.admin_action_grants g
      where g.granted_to = v_actor
        and g.action = 'inventory_adjust_access'
        and g.branch_id = p_branch_id
        and g.expires_at > now()
    ) then
    raise exception 'Ajustar inventario requiere la autorizacion de un administrador.'
      using errcode = '42501';
  end if;

  if p_quantity is null
    or p_quantity in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric) then
    raise exception 'La diferencia no es un numero valido.';
  end if;

  if p_quantity = 0 then
    raise exception 'La diferencia debe ser distinta de 0.';
  end if;

  if p_quantity <> trunc(p_quantity) then
    raise exception 'La diferencia debe ser un numero entero.';
  end if;

  if v_reason = '' then
    raise exception 'Captura el motivo del ajuste.';
  end if;

  select now() at time zone coalesce(b.timezone, 'America/Cancun')
  into v_local_now
  from public.branches b
  where b.id = p_branch_id;

  v_local_now := coalesce(v_local_now, now() at time zone 'America/Cancun');

  perform pg_advisory_xact_lock(hashtext('branch_inventory:' || p_product_id::text));

  select stock
  into v_row
  from public.branch_inventory
  where branch_id = p_branch_id and product_id = p_product_id
  for update;

  if not found then
    raise exception 'Este producto aún no existe en el inventario de la sucursal. Primero agrégalo en Inventario > Agregar.'
      using hint = 'INVENTORY_NOT_REGISTERED';
  end if;

  v_previous := coalesce(v_row.stock, 0);
  v_new_stock := v_previous + p_quantity;

  if v_new_stock < 0 then
    raise exception E'No puedes dejar el stock en negativo.\n\nStock actual: %\nAjuste: %\nResultado: %',
      round(v_previous)::integer,
      round(p_quantity)::integer,
      round(v_new_stock)::integer
      using hint = 'NEGATIVE_STOCK';
  end if;

  update public.branch_inventory
  set stock = v_new_stock,
      is_active = true,
      has_been_stocked = true,
      updated_at = now()
  where branch_id = p_branch_id and product_id = p_product_id;

  insert into public.inventory_movements (
    branch_id,
    product_id,
    movement_type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    user_id,
    created_at
  )
  values (
    p_branch_id,
    p_product_id,
    'adjustment',
    round(p_quantity)::integer,
    round(v_previous)::integer,
    round(v_new_stock)::integer,
    case when v_notes = '' then v_reason else v_reason || ' - ' || v_notes end,
    v_actor,
    v_local_now
  );

  return jsonb_build_object(
    'success', true,
    'productId', p_product_id,
    'previousStock', v_previous,
    'newStock', v_new_stock,
    'quantity', p_quantity
  );
end;
$$;

revoke all on function public.apply_inventory_adjustment(uuid, uuid, numeric, text, text) from public, anon;
grant execute on function public.apply_inventory_adjustment(uuid, uuid, numeric, text, text) to authenticated, service_role;
