-- Fecha los movimientos de `receive_store_order` con la hora local de la sucursal.
-- Motivo: `inventory_movements.created_at` es `timestamp without time zone`, la
-- base corre en UTC y el resto de las entradas (alta de inventario, ventas) se
-- guardan en hora local. Con `now()` las recepciones aparecian en el kardex unas
-- 5 horas adelantadas.
-- Cambio sobre el cuerpo de 20261117180000 (misma firma y permisos): el insert en
-- `inventory_movements` usa `now() at time zone coalesce(branches.timezone,
-- 'America/Cancun')`. Las demas columnas de pedidos (`accepted_at`) no cambian.
-- No corrige filas historicas.
-- Rollback: reaplicar la funcion de 20261117180000.

create or replace function public.receive_store_order(
  p_order_id uuid,
  p_to_branch_id uuid,
  p_user_id uuid,
  p_received_qty_map jsonb,
  p_receipt_notes text default null,
  p_received_cost_map jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := coalesce(
    auth.uid(),
    case when auth.role() = 'service_role' then p_user_id end
  );
  v_order record;
  v_item record;
  v_raw text;
  v_received numeric;
  v_difference numeric;
  v_cost numeric;
  v_cost_raw text;
  v_current_cost numeric;
  v_new_cost numeric;
  v_sale numeric;
  v_previous numeric;
  v_new_stock numeric;
  v_shortages text[] := '{}';
  v_overages text[] := '{}';
  v_abs_label text;
  v_signed_label text;
  v_has_difference boolean := false;
  v_notes text;
  v_status text;
  v_local_now timestamp;
begin
  if v_actor is null then
    raise exception 'Se requiere un usuario autenticado para recibir el pedido.';
  end if;

  select *
  into v_order
  from public.store_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'El pedido % no existe.', p_order_id;
  end if;

  if v_order.status <> 'pending' then
    raise exception 'Solo se pueden recibir pedidos pendientes.';
  end if;

  if p_to_branch_id is null or v_order.to_branch_id <> p_to_branch_id then
    raise exception 'El pedido no corresponde a la sucursal activa.';
  end if;

  if auth.uid() is not null
    and not public._user_can_access_branch(p_to_branch_id) then
    raise exception 'No tienes acceso a esta sucursal.'
      using errcode = '42501';
  end if;

  -- `inventory_movements.created_at` no tiene zona y el kardex lo lee como hora
  -- local: se fecha con la zona de la sucursal, como create_sale_transaction.
  select now() at time zone coalesce(b.timezone, 'America/Cancun')
  into v_local_now
  from public.branches b
  where b.id = p_to_branch_id;

  v_local_now := coalesce(v_local_now, now() at time zone 'America/Cancun');

  if p_received_qty_map is null or jsonb_typeof(p_received_qty_map) <> 'object' then
    raise exception 'Debes capturar el conteo fisico de todas las partidas.';
  end if;

  if p_received_cost_map is not null
    and jsonb_typeof(p_received_cost_map) <> 'object' then
    raise exception 'El costo de recepcion debe enviarse por producto.';
  end if;

  if char_length(coalesce(trim(p_receipt_notes), '')) > 500 then
    raise exception 'La nota de recepción no puede exceder 500 caracteres.';
  end if;

  for v_item in
    select *
    from public.store_order_items
    where order_id = p_order_id
    order by department_name, product_name
  loop
    v_raw := p_received_qty_map ->> v_item.product_id::text;

    if v_raw is null or trim(v_raw) = '' then
      raise exception 'Falta capturar la cantidad recibida de %.', v_item.product_name;
    end if;

    v_received := v_raw::numeric;

    if v_received in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric) then
      raise exception 'La cantidad recibida de % no es un numero valido.', v_item.product_name;
    end if;

    if v_received < 0 then
      raise exception 'La cantidad recibida de % no puede ser negativa.', v_item.product_name;
    end if;

    if v_received <> trunc(v_received) then
      raise exception 'La cantidad recibida de % debe ser un numero entero.', v_item.product_name;
    end if;

    v_difference := v_received - v_item.expected_qty;
    v_abs_label := trim(to_char(abs(v_difference), 'FM9999999990.0000'));
    v_abs_label := rtrim(rtrim(v_abs_label, '0'), '.');

    if v_abs_label = '' then
      v_abs_label := '0';
    end if;

    if v_difference < 0 then
      v_signed_label := '-' || v_abs_label;
      v_shortages := array_append(
        v_shortages,
        v_abs_label || 'x ' || v_item.product_name || ' (' || v_signed_label || ')'
      );
      v_has_difference := true;
    elsif v_difference > 0 then
      v_signed_label := '+' || v_abs_label;
      v_overages := array_append(
        v_overages,
        v_abs_label || 'x ' || v_item.product_name || ' (' || v_signed_label || ')'
      );
      v_has_difference := true;
    end if;

    update public.store_order_items
    set received_qty = v_received,
        difference_qty = v_difference
    where id = v_item.id;

    if v_received > 0 then
      -- Costo de adquisicion capturado en la recepcion. Sin mapa (cliente
      -- anterior a esta migracion) o sin la partida, se usa el snapshot del
      -- pedido para no romper la recepcion.
      v_cost_raw := p_received_cost_map ->> v_item.product_id::text;

      if v_cost_raw is null or trim(v_cost_raw) = '' then
        v_cost := coalesce(v_item.cost_price, 0);
      else
        begin
          v_cost := v_cost_raw::numeric;
        exception when invalid_text_representation then
          raise exception 'El costo de % no es un numero valido.', v_item.product_name;
        end;
      end if;

      if v_cost in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric) then
        raise exception 'El costo de % no es un numero valido.', v_item.product_name;
      end if;

      if v_cost < 0 then
        raise exception 'El costo de % no puede ser negativo.', v_item.product_name;
      end if;

      if v_cost > 1000000 then
        raise exception 'El costo de % no puede ser mayor a 1,000,000.', v_item.product_name;
      end if;

      v_cost := round(v_cost, 2);

      update public.store_order_items
      set received_unit_cost = v_cost
      where id = v_item.id;

      select coalesce(sale_price, 0)
      into v_sale
      from public.products
      where id = v_item.product_id;

      perform pg_advisory_xact_lock(hashtext('branch_inventory:' || v_item.product_id::text));

      select stock, cost_price
      into v_previous, v_current_cost
      from public.branch_inventory
      where branch_id = p_to_branch_id and product_id = v_item.product_id
      for update;

      if not found then
        v_previous := 0;

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
          p_to_branch_id,
          v_item.product_id,
          v_received,
          0,
          0,
          true,
          true,
          v_cost,
          coalesce(v_sale, 0),
          now(),
          now()
        );
      else
        -- Costo Promedio Ponderado Movil, misma regla que
        -- inventoryCostCalculationService: sin stock previo positivo el costo
        -- es el del lote entrante. Costo vigente nulo cae al catalogo.
        v_previous := coalesce(v_previous, 0);

        if v_current_cost is null then
          select coalesce(cost_price, 0)
          into v_current_cost
          from public.products
          where id = v_item.product_id;
        end if;

        if v_previous <= 0 then
          v_new_cost := v_cost;
        else
          v_new_cost := round(
            (v_previous * greatest(coalesce(v_current_cost, 0), 0) + v_received * v_cost)
              / (v_previous + v_received),
            2
          );
        end if;

        update public.branch_inventory
        set stock = v_previous + v_received,
            cost_price = v_new_cost,
            is_active = true,
            has_been_stocked = true,
            updated_at = now()
        where branch_id = p_to_branch_id and product_id = v_item.product_id;
      end if;

      v_new_stock := v_previous + v_received;

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
        p_to_branch_id,
        v_item.product_id,
        'entry',
        round(v_received)::integer,
        round(v_previous)::integer,
        round(v_new_stock)::integer,
        'Recepcion pedido ' || v_order.order_number,
        v_actor,
        v_cost,
        round(v_cost * v_received, 2),
        v_local_now
      );
    end if;
  end loop;

  if v_has_difference and nullif(trim(p_receipt_notes), '') is null then
    raise exception 'La nota de recepción es obligatoria cuando hay diferencias en el conteo.';
  end if;

  if array_length(v_shortages, 1) is not null and array_length(v_overages, 1) is not null then
    v_notes := 'Faltantes: ' || array_to_string(v_shortages, '; ') ||
      '; Sobrantes: ' || array_to_string(v_overages, '; ');
  elsif array_length(v_shortages, 1) is not null then
    v_notes := 'Faltantes: ' || array_to_string(v_shortages, '; ');
  elsif array_length(v_overages, 1) is not null then
    v_notes := 'Sobrantes: ' || array_to_string(v_overages, '; ');
  end if;

  v_status := case when v_has_difference
    then 'accepted_with_difference'
    else 'accepted'
  end;

  update public.store_orders
  set status = v_status,
      accepted_at = now(),
      received_by_user_id = v_actor,
      discrepancy_notes = v_notes,
      receipt_notes = nullif(trim(p_receipt_notes), '')
  where id = p_order_id;

  return jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'status', v_status
  );
end;
$$;

revoke all on function public.receive_store_order(uuid, uuid, uuid, jsonb, text, jsonb) from public, anon;
grant execute on function public.receive_store_order(uuid, uuid, uuid, jsonb, text, jsonb) to authenticated, service_role;
