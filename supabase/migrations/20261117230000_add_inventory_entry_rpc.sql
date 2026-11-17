-- RPC transaccional para el alta de inventario (Inventario > Agregar).
-- Motivo: el cliente hacia lectura de `branch_inventory`, update/insert y el log
-- en `inventory_movements` como tres llamadas sueltas. Dos terminales que
-- agregaban stock del mismo producto a la vez leian el mismo stock y una suma
-- se perdia (y el CPP quedaba mal); si fallaba el log, el stock ya habia
-- cambiado sin rastro en el kardex.
-- La funcion bloquea la fila (advisory lock + `for update`, mismo patron que
-- `receive_store_order`), recalcula el Costo Promedio Ponderado y registra el
-- movimiento en una sola transaccion.
-- Reglas replicadas de inventoryAddService / inventoryCostCalculationService:
-- - `p_incoming_cost` nulo: entrada manual, se valoriza al CPP vigente y no lo
--   mueve. Con valor: compra, se pondera.
-- - CPP vigente: `branch_inventory.cost_price`, con fallback al catalogo.
-- - Sin stock previo positivo el CPP es el costo del lote entrante.
-- - Motivo: 'Entrada común' si la fila ya habia recibido stock, si no
--   'Alta inicial'.
-- - `inventory_movements.created_at` es `timestamp without time zone` y el
--   cliente guardaba hora local: se escribe la hora de la zona de la sucursal
--   (`branches.timezone`, fallback 'America/Cancun', como create_sale_transaction).
-- Rollback: drop function public.add_inventory_entry(uuid, uuid, numeric, numeric);

create or replace function public.add_inventory_entry(
  p_branch_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_incoming_cost numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_row record;
  v_has_row boolean;
  v_previous numeric;
  v_current_cost numeric;
  v_cost numeric;
  v_new_cost numeric;
  v_new_stock numeric;
  v_sale numeric;
  v_reason text;
  v_local_now timestamp;
begin
  if v_actor is null and auth.role() <> 'service_role' then
    raise exception 'Se requiere un usuario autenticado para agregar inventario.';
  end if;

  if p_branch_id is null then
    raise exception 'No hay una sucursal activa para registrar el inventario.';
  end if;

  if p_product_id is null then
    raise exception 'No se detectó el identificador del producto.';
  end if;

  if v_actor is not null
    and not public._user_can_access_branch(p_branch_id) then
    raise exception 'No tienes acceso a esta sucursal.'
      using errcode = '42501';
  end if;

  if p_quantity is null
    or p_quantity in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric) then
    raise exception 'La cantidad no es un numero valido.';
  end if;

  if p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor a 0.';
  end if;

  if p_quantity <> trunc(p_quantity) then
    raise exception 'La cantidad debe ser un numero entero.';
  end if;

  if p_incoming_cost is not null then
    if p_incoming_cost in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric) then
      raise exception 'El costo de compra no es un numero valido.';
    end if;

    if p_incoming_cost < 0 then
      raise exception 'El costo de compra no puede ser negativo.';
    end if;

    if p_incoming_cost > 1000000 then
      raise exception 'El costo de compra no puede ser mayor a 1,000,000.';
    end if;
  end if;

  select coalesce(sale_price, 0)
  into v_sale
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'El producto % no existe.', p_product_id;
  end if;

  select now() at time zone coalesce(b.timezone, 'America/Cancun')
  into v_local_now
  from public.branches b
  where b.id = p_branch_id;

  v_local_now := coalesce(v_local_now, now() at time zone 'America/Cancun');

  perform pg_advisory_xact_lock(hashtext('branch_inventory:' || p_product_id::text));

  select stock, cost_price, has_been_stocked
  into v_row
  from public.branch_inventory
  where branch_id = p_branch_id and product_id = p_product_id
  for update;

  v_has_row := found;
  v_previous := case when v_has_row then coalesce(v_row.stock, 0) else 0 end;
  v_current_cost := case when v_has_row then v_row.cost_price end;

  if v_current_cost is null then
    select coalesce(cost_price, 0)
    into v_current_cost
    from public.products
    where id = p_product_id;
  end if;

  v_current_cost := greatest(coalesce(v_current_cost, 0), 0);
  v_cost := round(coalesce(p_incoming_cost, v_current_cost), 2);

  if v_previous <= 0 then
    v_new_cost := v_cost;
  else
    v_new_cost := round(
      (v_previous * v_current_cost + p_quantity * v_cost)
        / (v_previous + p_quantity),
      2
    );
  end if;

  v_new_stock := v_previous + p_quantity;

  v_reason := case when v_has_row and coalesce(v_row.has_been_stocked, false)
    then 'Entrada común'
    else 'Alta inicial'
  end;

  if v_has_row then
    update public.branch_inventory
    set stock = v_new_stock,
        cost_price = v_new_cost,
        is_active = true,
        has_been_stocked = true,
        updated_at = now()
    where branch_id = p_branch_id and product_id = p_product_id;
  else
    insert into public.branch_inventory (
      branch_id,
      product_id,
      stock,
      min_stock,
      max_stock,
      is_active,
      has_been_stocked,
      cost_price,
      sale_price,
      created_at,
      updated_at
    )
    values (
      p_branch_id,
      p_product_id,
      v_new_stock,
      0,
      0,
      true,
      true,
      v_new_cost,
      v_sale,
      now(),
      now()
    );
  end if;

  insert into public.inventory_movements (
    branch_id,
    product_id,
    movement_type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    user_id,
    unit_cost,
    total_cost,
    created_at
  )
  values (
    p_branch_id,
    p_product_id,
    'entry',
    round(p_quantity)::integer,
    round(v_previous)::integer,
    round(v_new_stock)::integer,
    v_reason,
    v_actor,
    v_cost,
    round(v_cost * p_quantity, 2),
    v_local_now
  );

  return jsonb_build_object(
    'success', true,
    'productId', p_product_id,
    'previousStock', v_previous,
    'newStock', v_new_stock,
    'quantity', p_quantity,
    'previousCostPrice', v_current_cost,
    'costPrice', v_new_cost
  );
end;
$$;

revoke all on function public.add_inventory_entry(uuid, uuid, numeric, numeric) from public, anon;
grant execute on function public.add_inventory_entry(uuid, uuid, numeric, numeric) to authenticated, service_role;
