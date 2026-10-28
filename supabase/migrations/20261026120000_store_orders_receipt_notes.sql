-- Nota de recepcion capturada por el usuario al recibir un pedido.
-- 1) Columna nueva `receipt_notes`. No reutiliza `discrepancy_notes`, que
--    sigue generando el servidor con el detalle de faltantes y sobrantes.
-- 2) `receive_store_order` agrega `p_receipt_notes`, recalcula las diferencias
--    en servidor, exige la nota cuando hay al menos una diferencia y limita su
--    longitud a 500 caracteres. El cuerpo parte de la version vigente
--    (20261025200000_store_orders_revoke_anon.sql); no cambia folio, inventario
--    ni permisos. Idempotente.

alter table public.store_orders
  add column if not exists receipt_notes text;

-- Cambia la firma: se elimina la version de 4 argumentos para no dejar dos
-- sobrecargas de la misma RPC.
drop function if exists public.receive_store_order(uuid, uuid, uuid, jsonb);

create or replace function public.receive_store_order(
  p_order_id uuid,
  p_to_branch_id uuid,
  p_user_id uuid,
  p_received_qty_map jsonb,
  p_receipt_notes text default null
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

  if p_received_qty_map is null or jsonb_typeof(p_received_qty_map) <> 'object' then
    raise exception 'Debes capturar el conteo fisico de todas las partidas.';
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
      v_cost := coalesce(v_item.cost_price, 0);

      select coalesce(sale_price, 0)
      into v_sale
      from public.products
      where id = v_item.product_id;

      perform pg_advisory_xact_lock(hashtext('branch_inventory:' || v_item.product_id::text));

      select stock
      into v_previous
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
        update public.branch_inventory
        set stock = v_previous + v_received,
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
        now()
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

revoke all on function public.receive_store_order(uuid, uuid, uuid, jsonb, text) from public, anon;
grant execute on function public.receive_store_order(uuid, uuid, uuid, jsonb, text) to authenticated, service_role;
