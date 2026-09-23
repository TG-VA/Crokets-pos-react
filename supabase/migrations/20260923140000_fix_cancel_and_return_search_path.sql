-- Fija el search_path de cancel_sale_transaction y create_partial_return_transaction a 'public'.
--
-- KNOWN_ISSUES.md #53 (SEC-5): ambas RPCs son SECURITY DEFINER y, sin un
-- search_path fijado, un objeto creado por el llamador en un esquema previo
-- del path podia sombrear las referencias no calificadas dentro del cuerpo y
-- ejecutarse con los privilegios del definer (vector de escalada de
-- privilegios). Misma clase de vector que la resuelta en #49
-- (20260923130000_fix_create_sale_transaction_search_path.sql).
--
-- Se redefinen ambas funciones preservando EXACTAMENTE sus cuerpos (unica
-- adicion: la clausula SET a nivel de funcion) y se reafirman los grants
-- minimos: revocacion de anon/public y EXECUTE solo a authenticated y
-- service_role.
--
-- Origen de cada cuerpo:
--   cancel_sale_transaction            -> 20260917200000 (linea 280)
--   create_partial_return_transaction  -> 20260917200000 (linea 1133)
-- Cuerpos verificados byte a byte contra las fuentes (ver PR_AUDIT_HISTORY.md).

CREATE OR REPLACE FUNCTION public.cancel_sale_transaction(p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_cancel_reason text, p_refund_method_uuid uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_sale record;
  v_detail record;
  v_kit_item record;
  v_inventory record;
  v_cancel_id uuid;
  v_refund_amount numeric;

  v_reward_points_to_return integer := 0;
  v_earned_points_to_reverse integer := 0;
begin
    p_user_id := coalesce(auth.uid(), p_user_id);
  if p_sale_id is null then
    raise exception 'No se detectó la venta.';
  end if;

  if p_user_id is null then
    raise exception 'No se detectó el usuario.';
  end if;

  if p_branch_id is null then
    raise exception 'No se detectó la sucursal.';
  end if;

  if p_cancel_reason is null or btrim(p_cancel_reason) = '' then
    raise exception 'Debes indicar el motivo de cancelación.';
  end if;

  select
    id,
    branch_id,
    customer_id,
    status,
    total
  into v_sale
  from public.sales
  where id = p_sale_id
  for update;

  if not found then
    raise exception 'La venta no existe.';
  end if;

  if v_sale.branch_id <> p_branch_id then
    raise exception 'La venta no pertenece a la sucursal actual.';
  end if;

  if v_sale.status = 'cancelled' then
    raise exception 'La venta ya fue cancelada.';
  end if;

  if v_sale.status <> 'completed' then
    raise exception 'Solo se pueden cancelar ventas en estado completed.';
  end if;

  if exists (
    select 1
    from public.canceled_sales
    where sale_id = p_sale_id
  ) then
    raise exception 'Ya existe un registro de cancelación para esta venta.';
  end if;

  if p_refund_method_uuid is not null then
    if not exists (
      select 1
      from public.payment_methods
      where id = p_refund_method_uuid
    ) then
      raise exception 'El método de reembolso no existe.';
    end if;
  end if;

  /*
    Regresar inventario desde sale_details.

    Esto ya incluye:
    - productos normales
    - productos gratis por recompensa
    - productos con descuento por recompensa

    No se regresa inventario desde sale_reward_redemptions
    para evitar duplicar stock.
  */
  for v_detail in
    select
      sd.id as sale_detail_id,
      sd.product_id,
      sd.quantity,
      coalesce(p.is_kit, false) as is_kit,
      coalesce(p.tracks_inventory, true) as tracks_inventory
    from public.sale_details sd
    join public.products p on p.id = sd.product_id
    where sd.sale_id = p_sale_id
  loop
    if v_detail.is_kit is true then
      for v_kit_item in
        select
          ski.component_product_id,
          ski.quantity,
          p.name,
          coalesce(p.tracks_inventory, true) as tracks_inventory
        from public.sale_kit_items ski
        join public.products p on p.id = ski.component_product_id
        where ski.sale_id = p_sale_id
          and ski.sale_detail_id = v_detail.sale_detail_id
      loop
        if v_kit_item.tracks_inventory is true then
          select stock, is_active
          into v_inventory
          from public.branch_inventory
          where branch_id = p_branch_id
            and product_id = v_kit_item.component_product_id
          for update;

          if not found then
            raise exception 'No se encontró inventario para el componente "%" del kit.', v_kit_item.name;
          end if;

          update public.branch_inventory
          set
            stock = stock + v_kit_item.quantity,
            updated_at = now()
          where branch_id = p_branch_id
            and product_id = v_kit_item.component_product_id;

          insert into public.inventory_movements (
            product_id,
            movement_type,
            quantity,
            previous_stock,
            new_stock,
            reason,
            sale_id,
            user_id,
            branch_id,
            related_branch_id,
            created_at
          )
          values (
            v_kit_item.component_product_id,
            'canceled',
            v_kit_item.quantity,
            v_inventory.stock,
            v_inventory.stock + v_kit_item.quantity,
            'Cancelación de venta con kit: ' || p_cancel_reason,
            p_sale_id,
            p_user_id,
            p_branch_id,
            null,
            now()
          );
        end if;
      end loop;
    else
      if v_detail.tracks_inventory is true then
        select stock, is_active
        into v_inventory
        from public.branch_inventory
        where branch_id = p_branch_id
          and product_id = v_detail.product_id
        for update;

        if not found then
          raise exception 'No se encontró inventario para el producto %.', v_detail.product_id;
        end if;

        update public.branch_inventory
        set
          stock = stock + v_detail.quantity,
          updated_at = now()
        where branch_id = p_branch_id
          and product_id = v_detail.product_id;

        insert into public.inventory_movements (
          product_id,
          movement_type,
          quantity,
          previous_stock,
          new_stock,
          reason,
          sale_id,
          user_id,
          branch_id,
          related_branch_id,
          created_at
        )
        values (
          v_detail.product_id,
          'canceled',
          v_detail.quantity,
          v_inventory.stock,
          v_inventory.stock + v_detail.quantity,
          p_cancel_reason,
          p_sale_id,
          p_user_id,
          p_branch_id,
          null,
          now()
        );
      end if;
    end if;
  end loop;

  /*
    Puntos usados en recompensas.
    sale_reward_redemptions.total_points se guarda positivo.
  */
  select coalesce(sum(total_points), 0)::integer
  into v_reward_points_to_return
  from public.sale_reward_redemptions
  where sale_id = p_sale_id
    and reversed_at is null;

  /*
    Devolver puntos usados por recompensas.
    Se inserta movimiento positivo.
  */
  if v_sale.customer_id is not null and v_reward_points_to_return > 0 then
    insert into public.customer_points (
      customer_id,
      points,
      movement_type,
      source,
      related_sale_id,
      created_at,
      user_id,
      branch_id,
      reward_id,
      notes
    )
    values (
      v_sale.customer_id,
      v_reward_points_to_return,
      'earn',
      'cancellation',
      p_sale_id,
      now(),
      p_user_id,
      p_branch_id,
      null,
      'Puntos devueltos por cancelación de recompensa: ' || p_cancel_reason
    );
  end if;

  /*
    Revertir puntos ganados por la venta normal.
    Busca movimientos positivos de venta relacionados a esta venta.
  */
  select coalesce(sum(points), 0)::integer
  into v_earned_points_to_reverse
  from public.customer_points
  where related_sale_id = p_sale_id
    and points > 0
    and movement_type = 'earn'
    and source = 'sale';

  /*
    Descontar los puntos ganados.
    Se inserta movimiento negativo.
  */
  if v_sale.customer_id is not null and v_earned_points_to_reverse > 0 then
    insert into public.customer_points (
      customer_id,
      points,
      movement_type,
      source,
      related_sale_id,
      created_at,
      user_id,
      branch_id,
      reward_id,
      notes
    )
    values (
      v_sale.customer_id,
      -v_earned_points_to_reverse,
      'redeem',
      'cancellation',
      p_sale_id,
      now(),
      p_user_id,
      p_branch_id,
      null,
      'Puntos descontados por cancelación de venta: ' || p_cancel_reason
    );
  end if;

  /*
    Marcar canjes como revertidos.
    Esto evita doble devolución de puntos.
  */
  update public.sale_reward_redemptions
  set
    reversed_at = now(),
    reversed_by = p_user_id,
    reversal_reason = p_cancel_reason
  where sale_id = p_sale_id
    and reversed_at is null;

  v_refund_amount := coalesce(v_sale.total, 0);

  insert into public.canceled_sales (
    sale_id,
    user_id,
    branch_id,
    cancel_reason,
    refund_amount,
    canceled_at,
    created_at,
    refund_method_id
  )
  values (
    p_sale_id,
    p_user_id,
    p_branch_id,
    p_cancel_reason,
    v_refund_amount,
    now(),
    now(),
    p_refund_method_uuid
  )
  returning id into v_cancel_id;

  update public.sales
  set
    status = 'cancelled',
    updated_at = now()
  where id = p_sale_id;

  return v_cancel_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_partial_return_transaction(p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_return_reason text, p_refund_method_id uuid, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_sale record;
  v_item jsonb;
  v_sale_detail record;
  v_inventory record;
  v_return_id uuid;
  v_total_refund numeric := 0;
  v_total_units_original integer := 0;
  v_total_units_to_return integer := 0;
  v_total_units_already_returned integer := 0;
  v_remaining_units integer := 0;
  v_requested_qty integer := 0;
  v_already_returned_for_detail integer := 0;
  v_kit_item record;
  v_component_return_qty numeric := 0;
begin
    p_user_id := coalesce(auth.uid(), p_user_id);
  if p_sale_id is null then
    raise exception 'No se detectó la venta.';
  end if;

  if p_user_id is null then
    raise exception 'No se detectó el usuario.';
  end if;

  if p_branch_id is null then
    raise exception 'No se detectó la sucursal.';
  end if;

  if p_return_reason is null or btrim(p_return_reason) = '' then
    raise exception 'Debes indicar el motivo de la devolución.';
  end if;

  if p_refund_method_id is null then
    raise exception 'Debes seleccionar el método de devolución.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Debes enviar al menos un producto para devolución.';
  end if;

  if not exists (
    select 1
    from public.payment_methods
    where id = p_refund_method_id
  ) then
    raise exception 'El método de devolución no existe.';
  end if;

  select s.id, s.branch_id, s.status, s.total
  into v_sale
  from public.sales s
  where s.id = p_sale_id
  for update;

  if not found then
    raise exception 'La venta no existe.';
  end if;

  if v_sale.branch_id <> p_branch_id then
    raise exception 'La venta no pertenece a la sucursal actual.';
  end if;

  if v_sale.status = 'cancelled' then
    raise exception 'No se puede hacer devolución parcial a una venta cancelada.';
  end if;

  if v_sale.status <> 'completed' then
    raise exception 'Solo se pueden hacer devoluciones parciales sobre ventas completadas.';
  end if;

  select coalesce(sum(sd.quantity), 0)
  into v_total_units_original
  from public.sale_details sd
  where sd.sale_id = p_sale_id;

  if v_total_units_original <= 0 then
    raise exception 'La venta no tiene productos válidos para devolución.';
  end if;

  select coalesce(sum(sri.quantity), 0)
  into v_total_units_already_returned
  from public.sale_return_items sri
  inner join public.sale_returns sr on sr.id = sri.return_id
  where sr.sale_id = p_sale_id;

  for v_item in
    select * from jsonb_array_elements(p_items)
  loop
    if not (v_item ? 'sale_detail_id') then
      raise exception 'Cada item debe incluir sale_detail_id.';
    end if;

    if not (v_item ? 'quantity') then
      raise exception 'Cada item debe incluir quantity.';
    end if;

    v_requested_qty := coalesce((v_item->>'quantity')::integer, 0);

    if v_requested_qty <= 0 then
      raise exception 'La cantidad a devolver debe ser mayor a cero.';
    end if;

    select sd.id, sd.sale_id, sd.product_id, sd.quantity
    into v_sale_detail
    from public.sale_details sd
    where sd.id = (v_item->>'sale_detail_id')::uuid
      and sd.sale_id = p_sale_id;

    if not found then
      raise exception 'Uno de los productos no pertenece a esta venta.';
    end if;

    v_total_units_to_return := v_total_units_to_return + v_requested_qty;
  end loop;

  v_remaining_units :=
    v_total_units_original
    - v_total_units_already_returned
    - v_total_units_to_return;

  if v_remaining_units < 1 then
    raise exception 'Debe quedar al menos 1 unidad en la venta. Si deseas devolver todo, debes cancelar la venta.';
  end if;

  insert into public.sale_returns (
    sale_id,
    user_id,
    branch_id,
    return_reason,
    refund_method_id,
    total_refund,
    created_at
  )
  values (
    p_sale_id,
    p_user_id,
    p_branch_id,
    p_return_reason,
    p_refund_method_id,
    0,
    now()
  )
  returning id into v_return_id;

  for v_item in
    select * from jsonb_array_elements(p_items)
  loop
    select
      sd.id,
      sd.sale_id,
      sd.product_id,
      sd.quantity,
      sd.unit_price,
      sd.total_price,
      sd.original_unit_price,
      sd.final_unit_price,
      sd.discount_amount,
      p.is_kit,
      p.tracks_inventory
    into v_sale_detail
    from public.sale_details sd
    join public.products p on p.id = sd.product_id
    where sd.id = (v_item->>'sale_detail_id')::uuid
      and sd.sale_id = p_sale_id
    for update;

    if not found then
      raise exception 'Uno de los productos no pertenece a esta venta.';
    end if;

    v_requested_qty := coalesce((v_item->>'quantity')::integer, 0);

    select coalesce(sum(sri.quantity), 0)
    into v_already_returned_for_detail
    from public.sale_return_items sri
    inner join public.sale_returns sr on sr.id = sri.return_id
    where sr.sale_id = p_sale_id
      and sri.sale_detail_id = v_sale_detail.id;

    if v_requested_qty > (v_sale_detail.quantity - v_already_returned_for_detail) then
      raise exception 'La cantidad a devolver excede lo disponible para el producto %.', v_sale_detail.product_id;
    end if;

    insert into public.sale_return_items (
      return_id,
      sale_detail_id,
      product_id,
      quantity,
      unit_price,
      total_price,
      created_at
    )
    values (
      v_return_id,
      v_sale_detail.id,
      v_sale_detail.product_id,
      v_requested_qty,
      coalesce(v_sale_detail.final_unit_price, v_sale_detail.unit_price, 0),
      coalesce(v_sale_detail.final_unit_price, v_sale_detail.unit_price, 0) * v_requested_qty,
      now()
    );

    v_total_refund :=
      v_total_refund
      + (coalesce(v_sale_detail.final_unit_price, v_sale_detail.unit_price, 0) * v_requested_qty);

    if v_sale_detail.is_kit is true then
      for v_kit_item in
        select
          ski.component_product_id,
          ski.quantity,
          p.name,
          coalesce(p.tracks_inventory, true) as tracks_inventory
        from public.sale_kit_items ski
        join public.products p on p.id = ski.component_product_id
        where ski.sale_id = p_sale_id
          and ski.sale_detail_id = v_sale_detail.id
      loop
        if v_kit_item.tracks_inventory is true then
          v_component_return_qty :=
            (coalesce(v_kit_item.quantity, 0) / nullif(v_sale_detail.quantity, 0))
            * v_requested_qty;

          select bi.stock, bi.is_active
          into v_inventory
          from public.branch_inventory bi
          where bi.branch_id = p_branch_id
            and bi.product_id = v_kit_item.component_product_id
          for update;

          if not found then
            raise exception 'No se encontró inventario para el componente "%" del kit.', v_kit_item.name;
          end if;

          update public.branch_inventory
          set
            stock = stock + v_component_return_qty,
            updated_at = now()
          where branch_id = p_branch_id
            and product_id = v_kit_item.component_product_id;

          insert into public.inventory_movements (
            product_id,
            movement_type,
            quantity,
            previous_stock,
            new_stock,
            reason,
            sale_id,
            user_id,
            branch_id,
            related_branch_id,
            created_at
          )
          values (
            v_kit_item.component_product_id,
            'return',
            v_component_return_qty,
            v_inventory.stock,
            v_inventory.stock + v_component_return_qty,
            'Devolución parcial de kit: ' || p_return_reason,
            p_sale_id,
            p_user_id,
            p_branch_id,
            null,
            now()
          );
        end if;
      end loop;
    else
      if coalesce(v_sale_detail.tracks_inventory, true) is true then
        select bi.stock, bi.is_active
        into v_inventory
        from public.branch_inventory bi
        where bi.branch_id = p_branch_id
          and bi.product_id = v_sale_detail.product_id
        for update;

        if not found then
          raise exception 'No se encontró inventario para el producto %.', v_sale_detail.product_id;
        end if;

        update public.branch_inventory
        set
          stock = stock + v_requested_qty,
          updated_at = now()
        where branch_id = p_branch_id
          and product_id = v_sale_detail.product_id;

        insert into public.inventory_movements (
          product_id,
          movement_type,
          quantity,
          previous_stock,
          new_stock,
          reason,
          sale_id,
          user_id,
          branch_id,
          related_branch_id,
          created_at
        )
        values (
          v_sale_detail.product_id,
          'return',
          v_requested_qty,
          v_inventory.stock,
          v_inventory.stock + v_requested_qty,
          p_return_reason,
          p_sale_id,
          p_user_id,
          p_branch_id,
          null,
          now()
        );
      end if;
    end if;
  end loop;

  update public.sale_returns
  set total_refund = v_total_refund
  where id = v_return_id;

  update public.sales
  set updated_at = now()
  where id = p_sale_id;

  return v_return_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.cancel_sale_transaction(p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_cancel_reason text, p_refund_method_uuid uuid) FROM public;
REVOKE ALL ON FUNCTION public.cancel_sale_transaction(p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_cancel_reason text, p_refund_method_uuid uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_sale_transaction(p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_cancel_reason text, p_refund_method_uuid uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_sale_transaction(p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_cancel_reason text, p_refund_method_uuid uuid) TO service_role;

REVOKE ALL ON FUNCTION public.create_partial_return_transaction(p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_return_reason text, p_refund_method_id uuid, p_items jsonb) FROM public;
REVOKE ALL ON FUNCTION public.create_partial_return_transaction(p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_return_reason text, p_refund_method_id uuid, p_items jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_partial_return_transaction(p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_return_reason text, p_refund_method_id uuid, p_items jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_partial_return_transaction(p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_return_reason text, p_refund_method_id uuid, p_items jsonb) TO service_role;
