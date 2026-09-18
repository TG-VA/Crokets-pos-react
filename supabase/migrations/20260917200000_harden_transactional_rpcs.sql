-- Hardening de autorizacion en RPCs transaccionales (KNOWN_ISSUES #10/#13/#38).
-- - Revoca EXECUTE a anon y PUBLIC: solo usuarios autenticados pueden invocarlas.
-- - Fija p_user_id desde auth.uid() para impedir suplantacion por parte de un
--   usuario autenticado; se conserva el valor entrante unicamente cuando no hay
--   sesion (service_role / jobs internos, que omiten RLS y no pasan por anon).
-- El RLS se mantiene sin cambios (modelo authenticated de confianza).

CREATE OR REPLACE FUNCTION public.cancel_sale(p_sale_id uuid, p_reason text, p_refund_method_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_status TEXT;
  v_branch_id UUID;
  v_user_id UUID;
  v_total NUMERIC(10,2);

  v_session_id UUID;
  v_refund_affects_cash BOOLEAN;

  r_detail RECORD;
  r_kit RECORD;

  v_prev_stock NUMERIC(10,3);
  v_new_stock  NUMERIC(10,3);

  v_is_kit BOOLEAN;
BEGIN
  -- 1) Bloquear la venta
  SELECT status, branch_id, user_id, total
    INTO v_status, v_branch_id, v_user_id, v_total
  FROM sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La venta % no existe', p_sale_id;
  END IF;

  IF v_status = 'cancelled' THEN
    RAISE EXCEPTION 'La venta % ya está cancelada', p_sale_id;
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Debe indicar un motivo de cancelación';
  END IF;

  -- Validar método de reembolso
  SELECT affects_cash
    INTO v_refund_affects_cash
  FROM payment_methods
  WHERE id = p_refund_method_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Método de reembolso inválido (no existe en payment_methods)';
  END IF;

  -- Consistencia branch_id en detalles (si existen)
  IF EXISTS (
    SELECT 1
    FROM sale_details
    WHERE sale_id = p_sale_id
      AND branch_id <> v_branch_id
  ) THEN
    RAISE EXCEPTION 'La venta % tiene sale_details con branch_id distinto al de sales', p_sale_id;
  END IF;

  -- CASO A: Venta OPEN (no afectó inventario ni caja)
  IF v_status = 'open' THEN
    INSERT INTO canceled_sales (
      id, sale_id, user_id, cancel_reason, canceled_at, refund_amount, refund_method_id, created_at
    ) VALUES (
      gen_random_uuid(), p_sale_id, v_user_id, p_reason, now(), NULL, p_refund_method_id, now()
    );

    UPDATE sales
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = p_sale_id;

    RETURN;
  END IF;

  -- CASO B: Venta COMPLETED (reversa inventario + posible ajuste de caja)
  IF v_status <> 'completed' THEN
    RAISE EXCEPTION 'Solo se puede cancelar ventas open o completed. Estado actual: %', v_status;
  END IF;

  -- Si el reembolso afecta efectivo, debe existir caja abierta
  IF v_refund_affects_cash THEN
    SELECT id
      INTO v_session_id
    FROM cash_register_sessions
    WHERE branch_id = v_branch_id
      AND status = 'open'
    ORDER BY opened_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No hay sesión de caja OPEN para la sucursal % (venta %)', v_branch_id, p_sale_id;
    END IF;
  END IF;

  -- Revertir inventario por cada línea vendida (normal o kit)
  FOR r_detail IN
    SELECT id AS sale_detail_id, product_id, quantity
    FROM sale_details
    WHERE sale_id = p_sale_id
  LOOP
    -- ¿Es kit?
    SELECT is_kit
      INTO v_is_kit
    FROM products
    WHERE id = r_detail.product_id;

    IF v_is_kit IS NULL THEN
      RAISE EXCEPTION 'Producto % no existe en products', r_detail.product_id;
    END IF;

    -- =========================
    -- CASO 1: PRODUCTO NORMAL
    -- =========================
    IF v_is_kit = false THEN
      SELECT stock
        INTO v_prev_stock
      FROM branch_inventory
      WHERE branch_id = v_branch_id
        AND product_id = r_detail.product_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe branch_inventory para product_id % en sucursal %',
          r_detail.product_id, v_branch_id;
      END IF;

      v_new_stock := v_prev_stock + r_detail.quantity;

      UPDATE branch_inventory
      SET stock = v_new_stock,
          updated_at = now()
      WHERE branch_id = v_branch_id
        AND product_id = r_detail.product_id;

      INSERT INTO inventory_movements (
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
      ) VALUES (
        r_detail.product_id,
        'canceled',
        r_detail.quantity, -- entrada
        v_prev_stock,
        v_new_stock,
        'Entrada por cancelación total',
        p_sale_id,
        v_user_id,
        v_branch_id,
        NULL,
        now()
      );

    -- =========================
    -- CASO 2: PRODUCTO KIT
    -- =========================
    ELSE
      -- Debe existir snapshot de componentes para esa venta y esa línea
      IF NOT EXISTS (
        SELECT 1
        FROM sale_kit_items
        WHERE sale_id = p_sale_id
          AND sale_detail_id = r_detail.sale_detail_id
      ) THEN
        RAISE EXCEPTION 'La venta % contiene un kit, pero no hay sale_kit_items para sale_detail_id %',
          p_sale_id, r_detail.sale_detail_id;
      END IF;

      -- Revertir inventario por cada componente registrado en el snapshot
      FOR r_kit IN
        SELECT component_product_id, quantity
        FROM sale_kit_items
        WHERE sale_id = p_sale_id
          AND sale_detail_id = r_detail.sale_detail_id
      LOOP
        SELECT stock
          INTO v_prev_stock
        FROM branch_inventory
        WHERE branch_id = v_branch_id
          AND product_id = r_kit.component_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'No existe branch_inventory para componente % (kit %) en sucursal %',
            r_kit.component_product_id, r_detail.product_id, v_branch_id;
        END IF;

        v_new_stock := v_prev_stock + r_kit.quantity;

        UPDATE branch_inventory
        SET stock = v_new_stock,
            updated_at = now()
        WHERE branch_id = v_branch_id
          AND product_id = r_kit.component_product_id;

        INSERT INTO inventory_movements (
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
        ) VALUES (
          r_kit.component_product_id,
          'canceled',
          r_kit.quantity, -- entrada
          v_prev_stock,
          v_new_stock,
          'Entrada por cancelación total (componente de kit)',
          p_sale_id,
          v_user_id,
          v_branch_id,
          NULL,
          now()
        );
      END LOOP;

    END IF;
  END LOOP;

  -- Ajustar caja SOLO si el reembolso afecta efectivo (incluye dólares en billete)
  IF v_refund_affects_cash THEN
    INSERT INTO cash_movements (
      session_id,
      user_id,
      movement_type,
      amount,
      description,
      branch_id,
      created_at
    ) VALUES (
      v_session_id,
      v_user_id,
      'canceled',
      v_total,
      'Salida por cancelación total (reembolso en efectivo)',
      v_branch_id,
      now()
    );
  END IF;

  -- Registrar cancelación
  INSERT INTO canceled_sales (
    id, sale_id, user_id, cancel_reason, canceled_at, refund_amount, refund_method_id, created_at
  ) VALUES (
    gen_random_uuid(), p_sale_id, v_user_id, p_reason, now(), v_total, p_refund_method_id, now()
  );

  -- Marcar venta como cancelled
  UPDATE sales
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_sale_id;

END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_sale_transaction(p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_cancel_reason text, p_refund_method_uuid uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.cancel_transfer_order(p_transfer_id uuid, p_current_branch uuid, p_user_id uuid, p_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_transfer      record;
    v_origin_br_id  uuid;
    v_dest_br_id    uuid;
    v_status        text;
    v_raw_notes     text;
    v_note_text     text;
    v_meta          jsonb;
    v_sep_idx       integer;
    v_temp          text;
    v_folio         text;
    v_origin_name   text;
    v_dest_name     text;
    v_database_ts   timestamptz := now();
    v_item          record;
    v_product_id    uuid;
    v_req_qty       integer;
    v_cost_price    numeric;
    v_sale_price    numeric;
    v_reason        text;
    v_items_meta    jsonb := '{}'::jsonb;
    v_cancel_meta   jsonb;
    v_notes_final   text;
begin
    p_user_id := coalesce(auth.uid(), p_user_id);
    select t.from_branch_id, t.to_branch_id, t.status, t.notes,
           fb.name as fb_name, tb.name as tb_name
    into v_transfer
    from public.inventory_transfers t
    left join public.branches fb on fb.id = t.from_branch_id
    left join public.branches tb on tb.id = t.to_branch_id
    where t.id = p_transfer_id;

    if not found then
        raise exception 'No se encontró la orden de traspaso.';
    end if;

    v_origin_br_id := v_transfer.from_branch_id;
    v_dest_br_id   := v_transfer.to_branch_id;
    v_status       := v_transfer.status;
    v_raw_notes    := coalesce(v_transfer.notes, '');
    v_origin_name  := coalesce(v_transfer.fb_name, 'SUCURSAL ORIGEN');
    v_dest_name    := coalesce(v_transfer.tb_name, 'SUCURSAL DESTINO');

    if p_current_branch is null or v_origin_br_id <> p_current_branch then
        raise exception 'Solo la sucursal origen puede cancelar este traspaso.';
    end if;
    if v_status <> 'pending_receipt' then
        raise exception 'Solo se pueden cancelar órdenes pendientes de recepción.';
    end if;

    v_sep_idx := position(chr(10)||chr(10)||'##TRANSFER_META##' in v_raw_notes);
    if v_sep_idx > 0 then
        v_note_text := btrim(substring(v_raw_notes from 1 for v_sep_idx - 1));
        v_temp      := substring(v_raw_notes from v_sep_idx
                        + length(chr(10)||chr(10)||'##TRANSFER_META##'));
        begin
            v_meta := btrim(coalesce(v_temp,'{}'))::jsonb;
            if jsonb_typeof(v_meta) <> 'object' then v_meta := '{}'::jsonb; end if;
        exception when others then
            v_meta := '{}'::jsonb;
        end;
    else
        v_note_text := btrim(v_raw_notes);
        v_meta      := '{}'::jsonb;
    end if;

    v_folio := coalesce(v_meta ->> 'folio', 'TR-SIN-FOLIO');

    for v_item in
        select iti.product_id, iti.quantity, iti.cost_price
        from public.inventory_transfer_items iti
        where iti.transfer_id = p_transfer_id
    loop
        v_product_id := v_item.product_id;
        v_req_qty    := coalesce(v_item.quantity, 0)::integer;
        v_cost_price := coalesce(v_item.cost_price, 0);

        select coalesce(sale_price, 0) into v_sale_price
        from public.branch_inventory
        where branch_id = v_origin_br_id and product_id = v_product_id;
        v_sale_price := coalesce(v_sale_price, 0);

        if v_req_qty <= 0 then continue; end if;

        v_items_meta := v_items_meta || jsonb_build_object(
            v_product_id::text,
            jsonb_build_object(
                'receivedQty', 0,
                'returnedQty', v_req_qty
            )
        );

        v_reason := 'TRASPASO CANCELADO Y DEVUELTO A ' || v_folio
                    || ' ' || v_origin_name
                    || ' - Cancelado antes de recibir en ' || v_dest_name;

        perform public._apply_inventory_delta(
            p_branch_id  => v_origin_br_id,
            p_product_id => v_product_id,
            p_delta      => v_req_qty::numeric,
            p_cost_price => v_cost_price,
            p_sale_price => v_sale_price,
            p_reason     => v_reason,
            p_user_id    => p_user_id,
            p_created_at => v_database_ts
        );
    end loop;

    v_cancel_meta := coalesce(v_meta, '{}'::jsonb)
        || jsonb_build_object(
            'cancelledAt',         to_char(v_database_ts, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'cancelledByUserId',   p_user_id,
            'cancelledByUsername', coalesce(btrim(p_username), 'SISTEMA'),
            'itemOutcomes',        v_items_meta
        );

    v_notes_final := public._build_transfer_notes(v_note_text, v_cancel_meta);

    update public.inventory_transfers
    set status       = 'cancelled',
        completed_at = v_database_ts,
        notes        = v_notes_final
    where id = p_transfer_id;

    return jsonb_build_object(
        'success',    true,
        'transferId', p_transfer_id,
        'folio',      v_folio
    );

exception when others then
    raise exception 'cancel_transfer_order: % (SQLSTATE=%)', sqlerrm, sqlstate;
end;
$function$;

CREATE OR REPLACE FUNCTION public.close_cash_register_session(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_session public.cash_register_sessions%rowtype;
  v_cut public.cash_cuts%rowtype;
  v_updated public.cash_register_sessions%rowtype;
begin
  -- 1) Validar sesión existente
  select *
    into v_session
  from public.cash_register_sessions
  where id = p_session_id;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'No existe el turno.');
  end if;

  -- 2) Validar que pertenezca al usuario autenticado
  if v_session.user_id <> auth.uid() then
    return jsonb_build_object('ok', false, 'message', 'No puedes cerrar un turno de otro usuario.');
  end if;

  -- 3) Validar que no esté ya cerrado
  if v_session.closed_at is not null or v_session.status = 'closed' then
    return jsonb_build_object('ok', false, 'message', 'Este turno ya está cerrado.');
  end if;

  -- 4) Validar que exista corte de cajero
  select *
    into v_cut
  from public.cash_cuts
  where cash_register_session_id = p_session_id
    and cut_type = 'shift'
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Primero debes hacer el CORTE DE CAJERO para poder cerrar turno.'
    );
  end if;

  -- 5) Cerrar turno
  update public.cash_register_sessions
  set
    closing_amount = v_cut.counted_amount,
    difference     = v_cut.difference,
    closed_at      = now(),
    status         = 'closed'
  where id = p_session_id
  returning * into v_updated;

  return jsonb_build_object(
    'ok', true,
    'message', 'Turno cerrado correctamente.',
    'session', row_to_json(v_updated)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.complete_sale(p_sale_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_status TEXT;
  v_branch_id UUID;
  v_user_id UUID;
  v_total NUMERIC(10,2);
  v_paid NUMERIC(10,2);
  v_session_id UUID;

  v_cash_paid_mxn NUMERIC(12,2);

  r_detail RECORD;
  r_kit_item RECORD;

  v_prev_stock NUMERIC(10,3);
  v_new_stock  NUMERIC(10,3);

  v_is_kit BOOLEAN;
  v_kit_id UUID;

  v_component_qty NUMERIC(10,3);
BEGIN
  -- 1) Bloquear la venta para evitar que dos procesos la completen al mismo tiempo
  SELECT status, branch_id, user_id, total
    INTO v_status, v_branch_id, v_user_id, v_total
  FROM sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La venta % no existe', p_sale_id;
  END IF;

  IF v_status <> 'open' THEN
    RAISE EXCEPTION 'La venta % no está en open (estado actual: %)', p_sale_id, v_status;
  END IF;

  -- 2) Debe tener al menos un producto
  IF NOT EXISTS (
    SELECT 1 FROM sale_details WHERE sale_id = p_sale_id
  ) THEN
    RAISE EXCEPTION 'La venta % no tiene productos (sale_details vacío)', p_sale_id;
  END IF;

  -- 3) Validar que la sucursal coincida en los detalles
  IF EXISTS (
    SELECT 1
    FROM sale_details
    WHERE sale_id = p_sale_id
      AND branch_id <> v_branch_id
  ) THEN
    RAISE EXCEPTION 'La venta % tiene sale_details con branch_id distinto al de sales', p_sale_id;
  END IF;

  -- 4) Validar pagos: SUM(pagos) = total (en MXN de la venta)
  SELECT COALESCE(SUM(amount), 0)
    INTO v_paid
  FROM sale_payments
  WHERE sale_id = p_sale_id;

  IF ROUND(v_paid, 2) <> ROUND(v_total, 2) THEN
    RAISE EXCEPTION 'Pagos no cuadran. Total: %, Pagado: % (venta %)', v_total, v_paid, p_sale_id;
  END IF;

  -- 5) Debe existir una caja abierta en la sucursal
  SELECT id
    INTO v_session_id
  FROM cash_register_sessions
  WHERE branch_id = v_branch_id
    AND status = 'open'
  ORDER BY opened_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No hay sesión de caja OPEN para la sucursal % (venta %)', v_branch_id, p_sale_id;
  END IF;

  -- 6) Por cada producto vendido:
  --    - si NO es kit: descuenta normal
  --    - si es kit: descuenta componentes (recipe) y genera sale_kit_items
  FOR r_detail IN
    SELECT id AS sale_detail_id, product_id, quantity
    FROM sale_details
    WHERE sale_id = p_sale_id
  LOOP
    -- ¿Es kit?
    SELECT is_kit
      INTO v_is_kit
    FROM products
    WHERE id = r_detail.product_id;

    IF v_is_kit IS NULL THEN
      RAISE EXCEPTION 'Producto % no existe en products', r_detail.product_id;
    END IF;

    -- =========================
    -- CASO 1: PRODUCTO NORMAL
    -- =========================
    IF v_is_kit = false THEN
      SELECT stock
        INTO v_prev_stock
      FROM branch_inventory
      WHERE branch_id = v_branch_id
        AND product_id = r_detail.product_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe branch_inventory para product_id % en sucursal %',
          r_detail.product_id, v_branch_id;
      END IF;

      IF v_prev_stock < r_detail.quantity THEN
        RAISE EXCEPTION 'Stock insuficiente. Producto %, stock %, requerido % (venta %)',
          r_detail.product_id, v_prev_stock, r_detail.quantity, p_sale_id;
      END IF;

      v_new_stock := v_prev_stock - r_detail.quantity;

      UPDATE branch_inventory
      SET stock = v_new_stock,
          updated_at = now()
      WHERE branch_id = v_branch_id
        AND product_id = r_detail.product_id;

      INSERT INTO inventory_movements (
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
      ) VALUES (
        r_detail.product_id,
        'sale',
        (r_detail.quantity * -1),
        v_prev_stock,
        v_new_stock,
        'Salida por venta completada',
        p_sale_id,
        v_user_id,
        v_branch_id,
        NULL,
        now()
      );

    -- =========================
    -- CASO 2: PRODUCTO KIT
    -- =========================
    ELSE
      -- Buscar kit_id activo para ese producto
      SELECT pk.id
        INTO v_kit_id
      FROM product_kits pk
      WHERE pk.kit_product_id = r_detail.product_id
        AND pk.is_active = true
      LIMIT 1;

      IF v_kit_id IS NULL THEN
        RAISE EXCEPTION 'El producto % está marcado como kit, pero no existe en product_kits (o está inactivo)',
          r_detail.product_id;
      END IF;

      -- Validar que tenga componentes
      IF NOT EXISTS (
        SELECT 1 FROM product_kit_items WHERE kit_id = v_kit_id
      ) THEN
        RAISE EXCEPTION 'El kit % no tiene componentes en product_kit_items', r_detail.product_id;
      END IF;

      -- Por cada componente del kit:
      FOR r_kit_item IN
        SELECT component_product_id, quantity
        FROM product_kit_items
        WHERE kit_id = v_kit_id
      LOOP
        -- Cantidad total a descontar = qty_componente * qty_kits_vendidos
        v_component_qty := (r_kit_item.quantity * r_detail.quantity);

        SELECT stock
          INTO v_prev_stock
        FROM branch_inventory
        WHERE branch_id = v_branch_id
          AND product_id = r_kit_item.component_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'No existe branch_inventory para componente % (kit %) en sucursal %',
            r_kit_item.component_product_id, r_detail.product_id, v_branch_id;
        END IF;

        IF v_prev_stock < v_component_qty THEN
          RAISE EXCEPTION 'Stock insuficiente para componente % del kit %. Stock %, requerido % (venta %)',
            r_kit_item.component_product_id, r_detail.product_id, v_prev_stock, v_component_qty, p_sale_id;
        END IF;

        v_new_stock := v_prev_stock - v_component_qty;

        UPDATE branch_inventory
        SET stock = v_new_stock,
            updated_at = now()
        WHERE branch_id = v_branch_id
          AND product_id = r_kit_item.component_product_id;

        -- Movimiento de inventario por componente
        INSERT INTO inventory_movements (
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
        ) VALUES (
          r_kit_item.component_product_id,
          'sale',
          (v_component_qty * -1),
          v_prev_stock,
          v_new_stock,
          'Salida por venta completada (componente de kit)',
          p_sale_id,
          v_user_id,
          v_branch_id,
          NULL,
          now()
        );

        -- Snapshot histórico de lo descontado por el kit
        INSERT INTO sale_kit_items (
          id,
          sale_id,
          sale_detail_id,
          kit_product_id,
          component_product_id,
          quantity,
          branch_id,
          created_at
        ) VALUES (
          gen_random_uuid(),
          p_sale_id,
          r_detail.sale_detail_id,
          r_detail.product_id,
          r_kit_item.component_product_id,
          v_component_qty,
          v_branch_id,
          now()
        );
      END LOOP;

    END IF;
  END LOOP;

  -- 7) Registrar ingreso en caja SOLO por métodos que afectan efectivo (Efectivo/Dólares)
  --    Si currency = 'USD', se convierte a MXN con exchange_rate
  SELECT COALESCE(SUM(
    CASE
      WHEN sp.currency = 'USD' THEN sp.amount * sp.exchange_rate
      ELSE sp.amount
    END
  ), 0)
  INTO v_cash_paid_mxn
  FROM sale_payments sp
  JOIN payment_methods pm ON pm.id = sp.payment_method_id
  WHERE sp.sale_id = p_sale_id
    AND pm.affects_cash = true;

  IF v_cash_paid_mxn > 0 THEN
    INSERT INTO cash_movements (
      session_id,
      user_id,
      movement_type,
      amount,
      description,
      branch_id,
      created_at
    ) VALUES (
      v_session_id,
      v_user_id,
      'sale',
      v_cash_paid_mxn,
      'Ingreso por venta completada (solo efectivo; USD convertido a MXN)',
      v_branch_id,
      now()
    );
  END IF;

  -- 8) Marcar venta como completed
  UPDATE sales
  SET status = 'completed',
      updated_at = now()
  WHERE id = p_sale_id;

END;
$function$;

CREATE OR REPLACE FUNCTION public.create_partial_return_transaction(p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_return_reason text, p_refund_method_id uuid, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_sale_id uuid;
  v_product jsonb;
  v_payment jsonb;
  v_inventory record;
  v_payment_method_id uuid;
  v_product_id uuid;
  v_quantity numeric;
  v_unit_price numeric;
  v_total_price numeric;
  v_stock numeric;
  v_payment_method_name text;
  v_amount numeric;
  v_currency text;
  v_exchange_rate numeric;
begin
    p_user_id := coalesce(auth.uid(), p_user_id);
  if p_branch_id is null then
    raise exception 'No se detectó la sucursal.';
  end if;

  if p_user_id is null then
    raise exception 'No se detectó el usuario.';
  end if;

  if p_products is null or jsonb_array_length(p_products) = 0 then
    raise exception 'No hay productos en la venta.';
  end if;

  if p_payments is null or jsonb_array_length(p_payments) = 0 then
    raise exception 'No hay pagos en la venta.';
  end if;

  for v_product in
    select *
    from jsonb_array_elements(p_products)
  loop
    v_product_id := (v_product ->> 'product_id')::uuid;
    v_quantity := coalesce((v_product ->> 'quantity')::numeric, 0);
    v_unit_price := coalesce((v_product ->> 'unit_price')::numeric, 0);
    v_total_price := coalesce((v_product ->> 'total_price')::numeric, 0);

    if v_product_id is null then
      raise exception 'Producto inválido en la venta.';
    end if;

    if v_quantity <= 0 then
      raise exception 'Cantidad inválida para producto %.', v_product_id;
    end if;

    if v_unit_price < 0 then
      raise exception 'Precio unitario inválido para producto %.', v_product_id;
    end if;

    if v_total_price < 0 then
      raise exception 'Importe inválido para producto %.', v_product_id;
    end if;

    select stock, is_active
    into v_inventory
    from public.branch_inventory
    where branch_id = p_branch_id
      and product_id = v_product_id
    for update;

    if not found then
      raise exception 'No se encontró inventario para el producto %.', v_product_id;
    end if;

    if v_inventory.is_active is false then
      raise exception 'El producto % no está activo en esta sucursal.', v_product_id;
    end if;

    v_stock := coalesce(v_inventory.stock, 0);

    if v_stock < v_quantity then
      raise exception 'Stock insuficiente para el producto %. Disponible: %, solicitado: %.',
        v_product_id, v_stock, v_quantity;
    end if;
  end loop;

  insert into public.sales (
    branch_id,
    user_id,
    customer_id,
    sale_date,
    subtotal,
    tax,
    total,
    status
  )
  values (
    p_branch_id,
    p_user_id,
    p_customer_id,
    p_sale_date,
    p_subtotal,
    p_tax,
    p_total,
    'open'
  )
  returning id into v_sale_id;

  for v_product in
    select *
    from jsonb_array_elements(p_products)
  loop
    v_product_id := (v_product ->> 'product_id')::uuid;
    v_quantity := coalesce((v_product ->> 'quantity')::numeric, 0);
    v_unit_price := coalesce((v_product ->> 'unit_price')::numeric, 0);
    v_total_price := coalesce((v_product ->> 'total_price')::numeric, 0);

    insert into public.sale_details (
      sale_id,
      product_id,
      branch_id,
      quantity,
      unit_price,
      total_price
    )
    values (
      v_sale_id,
      v_product_id,
      p_branch_id,
      v_quantity,
      v_unit_price,
      v_total_price
    );

    update public.branch_inventory
    set stock = stock - v_quantity
    where branch_id = p_branch_id
      and product_id = v_product_id;
  end loop;

  for v_payment in
    select *
    from jsonb_array_elements(p_payments)
  loop
    v_payment_method_name := v_payment ->> 'payment_method_name';
    v_amount := coalesce((v_payment ->> 'amount')::numeric, 0);
    v_currency := coalesce(v_payment ->> 'currency', 'MXN');
    v_exchange_rate := nullif(v_payment ->> 'exchange_rate', '')::numeric;

    if v_payment_method_name is null or btrim(v_payment_method_name) = '' then
      raise exception 'Método de pago inválido.';
    end if;

    if v_amount <= 0 then
      raise exception 'Monto de pago inválido.';
    end if;

    select id
    into v_payment_method_id
    from public.payment_methods
    where name = v_payment_method_name;

    if not found then
      raise exception 'No se encontró el método de pago "%".', v_payment_method_name;
    end if;

    insert into public.sale_payments (
      sale_id,
      payment_method_id,
      branch_id,
      amount,
      currency,
      exchange_rate
    )
    values (
      v_sale_id,
      v_payment_method_id,
      p_branch_id,
      v_amount,
      v_currency,
      v_exchange_rate
    );
  end loop;

  update public.sales
  set status = 'completed'
  where id = v_sale_id;

  return v_sale_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_sale_id uuid;
  v_existing_sale_id uuid;
  v_product jsonb;
  v_payment jsonb;
  v_inventory record;
  v_payment_method_id uuid;
  v_product_id uuid;
  v_quantity numeric;
  v_unit_price numeric;
  v_total_price numeric;
  v_stock numeric;
  v_payment_method_name text;
  v_amount numeric;
  v_currency text;
  v_exchange_rate numeric;
  v_total_payments numeric := 0;
begin
    p_user_id := coalesce(auth.uid(), p_user_id);
  if p_branch_id is null then
    raise exception 'No se detectó la sucursal.';
  end if;

  if p_user_id is null then
    raise exception 'No se detectó el usuario.';
  end if;

  if p_client_sale_token is null then
    raise exception 'No se detectó el token de venta.';
  end if;

  if p_subtotal < 0 then
    raise exception 'Subtotal inválido.';
  end if;

  if p_tax < 0 then
    raise exception 'Impuesto inválido.';
  end if;

  if p_total <= 0 then
    raise exception 'Total inválido.';
  end if;

  if p_products is null or jsonb_array_length(p_products) = 0 then
    raise exception 'No hay productos en la venta.';
  end if;

  if p_payments is null or jsonb_array_length(p_payments) = 0 then
    raise exception 'No hay pagos en la venta.';
  end if;

  select id
  into v_existing_sale_id
  from public.sales
  where client_sale_token = p_client_sale_token
  limit 1;

  if v_existing_sale_id is not null then
    return v_existing_sale_id;
  end if;

  for v_product in
    select *
    from jsonb_array_elements(p_products)
  loop
    v_product_id := (v_product ->> 'product_id')::uuid;
    v_quantity := coalesce((v_product ->> 'quantity')::numeric, 0);
    v_unit_price := coalesce((v_product ->> 'unit_price')::numeric, 0);
    v_total_price := coalesce((v_product ->> 'total_price')::numeric, 0);

    if v_product_id is null then
      raise exception 'Producto inválido en la venta.';
    end if;

    if v_quantity <= 0 then
      raise exception 'Cantidad inválida para producto %.', v_product_id;
    end if;

    if v_unit_price < 0 then
      raise exception 'Precio unitario inválido para producto %.', v_product_id;
    end if;

    if v_total_price < 0 then
      raise exception 'Importe inválido para producto %.', v_product_id;
    end if;

    select stock, is_active
    into v_inventory
    from public.branch_inventory
    where branch_id = p_branch_id
      and product_id = v_product_id
    for update;

    if not found then
      raise exception 'No se encontró inventario para el producto %.', v_product_id;
    end if;

    if v_inventory.is_active is false then
      raise exception 'El producto % no está activo en esta sucursal.', v_product_id;
    end if;

    v_stock := coalesce(v_inventory.stock, 0);

    if v_stock < v_quantity then
      raise exception 'Stock insuficiente para el producto %. Disponible: %, solicitado: %.',
        v_product_id, v_stock, v_quantity;
    end if;
  end loop;

  for v_payment in
    select *
    from jsonb_array_elements(p_payments)
  loop
    v_payment_method_name := v_payment ->> 'payment_method_name';
    v_amount := coalesce((v_payment ->> 'amount')::numeric, 0);

    if v_payment_method_name is null or btrim(v_payment_method_name) = '' then
      raise exception 'Método de pago inválido.';
    end if;

    if v_amount <= 0 then
      raise exception 'Monto de pago inválido.';
    end if;

    v_total_payments := v_total_payments + v_amount;
  end loop;

  if v_total_payments < p_total then
    raise exception 'Los pagos no cubren el total de la venta.';
  end if;

  begin
    insert into public.sales (
      branch_id,
      user_id,
      customer_id,
      sale_date,
      subtotal,
      tax,
      total,
      status,
      client_sale_token
    )
    values (
      p_branch_id,
      p_user_id,
      p_customer_id,
      p_sale_date,
      p_subtotal,
      p_tax,
      p_total,
      'open',
      p_client_sale_token
    )
    returning id into v_sale_id;

  exception
    when unique_violation then
      select id
      into v_sale_id
      from public.sales
      where client_sale_token = p_client_sale_token
      limit 1;

      if v_sale_id is not null then
        return v_sale_id;
      else
        raise;
      end if;
  end;

  for v_product in
    select *
    from jsonb_array_elements(p_products)
  loop
    v_product_id := (v_product ->> 'product_id')::uuid;
    v_quantity := coalesce((v_product ->> 'quantity')::numeric, 0);
    v_unit_price := coalesce((v_product ->> 'unit_price')::numeric, 0);
    v_total_price := coalesce((v_product ->> 'total_price')::numeric, 0);

    select stock
    into v_stock
    from public.branch_inventory
    where branch_id = p_branch_id
      and product_id = v_product_id;

    insert into public.sale_details (
      sale_id,
      product_id,
      branch_id,
      quantity,
      unit_price,
      total_price
    )
    values (
      v_sale_id,
      v_product_id,
      p_branch_id,
      v_quantity,
      v_unit_price,
      v_total_price
    );

    update public.branch_inventory
    set stock = stock - v_quantity
    where branch_id = p_branch_id
      and product_id = v_product_id;

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
      v_product_id,
      'sale',
      -v_quantity,
      v_stock,
      v_stock - v_quantity,
      'Venta registrada',
      v_sale_id,
      p_user_id,
      p_branch_id,
      null,
      now()
    );
  end loop;

  for v_payment in
    select *
    from jsonb_array_elements(p_payments)
  loop
    v_payment_method_name := v_payment ->> 'payment_method_name';
    v_amount := coalesce((v_payment ->> 'amount')::numeric, 0);
    v_currency := coalesce(v_payment ->> 'currency', 'MXN');
    v_exchange_rate := nullif(v_payment ->> 'exchange_rate', '')::numeric;

    select id
    into v_payment_method_id
    from public.payment_methods
    where lower(name) = lower(v_payment_method_name);

    if not found then
      raise exception 'No se encontró el método de pago "%".', v_payment_method_name;
    end if;

    insert into public.sale_payments (
      sale_id,
      payment_method_id,
      branch_id,
      amount,
      currency,
      exchange_rate
    )
    values (
      v_sale_id,
      v_payment_method_id,
      p_branch_id,
      v_amount,
      v_currency,
      v_exchange_rate
    );
  end loop;

  update public.sales
  set status = 'completed'
  where id = v_sale_id;

  return v_sale_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_sale_id uuid;
  v_existing_sale_id uuid;
  v_product jsonb;
  v_payment jsonb;
  v_inventory record;
  v_payment_method_id uuid;
  v_product_id uuid;
  v_quantity numeric;
  v_unit_price numeric;
  v_total_price numeric;
  v_stock numeric;
  v_payment_method_name text;
  v_amount numeric;
  v_currency text;
  v_exchange_rate numeric;
  v_reference text;
  v_total_payments numeric := 0;

  v_original_unit_price numeric;
  v_final_unit_price numeric;
  v_discount_type text;
  v_discount_value numeric;
  v_discount_amount numeric;
  v_discount_total numeric := 0;

  v_expected_total_price numeric;
  v_expected_discount_amount numeric;

  v_product_is_kit boolean;
  v_product_status boolean;
  v_product_tracks_inventory boolean;
  v_kit_id uuid;
  v_kit_is_active boolean;
  v_component record;
  v_component_required_qty numeric;
  v_component_inventory record;
  v_sale_detail_id uuid;
begin
    p_user_id := coalesce(auth.uid(), p_user_id);
  if p_branch_id is null then
    raise exception 'No se detectó la sucursal.';
  end if;

  if p_user_id is null then
    raise exception 'No se detectó el usuario.';
  end if;

  if p_client_sale_token is null then
    raise exception 'No se detectó el token de venta.';
  end if;

  if p_subtotal < 0 then
    raise exception 'Subtotal inválido.';
  end if;

  if p_tax < 0 then
    raise exception 'Impuesto inválido.';
  end if;

  if p_total < 0 then
    raise exception 'Total inválido.';
  end if;

  if p_products is null or jsonb_array_length(p_products) = 0 then
    raise exception 'No hay productos en la venta.';
  end if;

  if p_total > 0 and (p_payments is null or jsonb_array_length(p_payments) = 0) then
    raise exception 'No hay pagos en la venta.';
  end if;

  select id
  into v_existing_sale_id
  from public.sales
  where client_sale_token = p_client_sale_token
  limit 1;

  if v_existing_sale_id is not null then
    return v_existing_sale_id;
  end if;

  -- VALIDACIÓN DE PRODUCTOS / KITS
  for v_product in
    select *
    from jsonb_array_elements(p_products)
  loop
    v_product_id := (v_product ->> 'product_id')::uuid;
    v_quantity := coalesce((v_product ->> 'quantity')::numeric, 0);
    v_unit_price := round(coalesce((v_product ->> 'unit_price')::numeric, 0), 2);
    v_total_price := round(coalesce((v_product ->> 'total_price')::numeric, 0), 2);

    v_original_unit_price := round(
      coalesce((v_product ->> 'original_unit_price')::numeric, v_unit_price),
      2
    );

    v_final_unit_price := round(
      coalesce((v_product ->> 'final_unit_price')::numeric, v_unit_price),
      2
    );

    v_discount_type := nullif(
      btrim(coalesce(v_product ->> 'discount_type', '')),
      ''
    );

    v_discount_value := round(
      coalesce((v_product ->> 'discount_value')::numeric, 0),
      2
    );

    v_discount_amount := round(
      coalesce((v_product ->> 'discount_amount')::numeric, 0),
      2
    );

    v_expected_total_price := round(v_final_unit_price * v_quantity, 2);
    v_expected_discount_amount := round(
      (v_original_unit_price - v_final_unit_price) * v_quantity,
      2
    );

    if v_product_id is null then
      raise exception 'Producto inválido en la venta.';
    end if;

    if v_quantity <= 0 then
      raise exception 'Cantidad inválida para producto %.', v_product_id;
    end if;

    if v_unit_price < 0 then
      raise exception 'Precio unitario inválido para producto %.', v_product_id;
    end if;

    if v_total_price < 0 then
      raise exception 'Importe inválido para producto %.', v_product_id;
    end if;

    if v_original_unit_price < 0 then
      raise exception 'Precio original inválido para producto %.', v_product_id;
    end if;

    if v_final_unit_price < 0 then
      raise exception 'Precio final inválido para producto %.', v_product_id;
    end if;

    if v_discount_amount < 0 then
      raise exception 'Descuento inválido para producto %.', v_product_id;
    end if;

    if v_final_unit_price > v_original_unit_price then
      raise exception 'El precio final no puede ser mayor al precio original para producto %.', v_product_id;
    end if;

    if round(v_total_price, 2) <> v_expected_total_price then
      raise exception 'El importe no coincide con el precio final por la cantidad para producto %.', v_product_id;
    end if;

    if round(v_discount_amount, 2) <> v_expected_discount_amount then
      raise exception 'El descuento no coincide con la diferencia entre precio original y final para producto %.', v_product_id;
    end if;

    if v_discount_amount > 0 and v_discount_type is null then
      raise exception 'Falta el tipo de descuento para producto %.', v_product_id;
    end if;

    if v_discount_amount = 0 and v_discount_value <> 0 then
      raise exception 'El valor de descuento no corresponde para producto %.', v_product_id;
    end if;

    select is_kit, status, tracks_inventory
    into v_product_is_kit, v_product_status, v_product_tracks_inventory
    from public.products
    where id = v_product_id;

    if not found then
      raise exception 'No se encontró el producto %.', v_product_id;
    end if;

    if v_product_status is false then
      raise exception 'El producto % está inactivo.', v_product_id;
    end if;

    if v_product_is_kit is true then
      select id, is_active
      into v_kit_id, v_kit_is_active
      from public.product_kits
      where kit_product_id = v_product_id;

      if not found then
        raise exception 'El kit % no tiene configuración registrada.', v_product_id;
      end if;

      if v_kit_is_active is false then
        raise exception 'El kit % está inactivo.', v_product_id;
      end if;

      if not exists (
        select 1
        from public.product_kit_items
        where kit_id = v_kit_id
      ) then
        raise exception 'El kit % no tiene componentes registrados.', v_product_id;
      end if;

      for v_component in
        select
          pki.component_product_id,
          pki.quantity,
          p.name,
          p.status,
          p.tracks_inventory
        from public.product_kit_items pki
        join public.products p on p.id = pki.component_product_id
        where pki.kit_id = v_kit_id
      loop
        if v_component.status is false then
          raise exception 'El componente % del kit está inactivo.', v_component.name;
        end if;

        v_component_required_qty := coalesce(v_component.quantity, 0) * v_quantity;

        if v_component_required_qty <= 0 then
          raise exception 'Cantidad inválida en componente del kit %.', v_product_id;
        end if;

        if v_component.tracks_inventory is true then
          select stock, is_active, has_been_stocked
          into v_component_inventory
          from public.branch_inventory
          where branch_id = p_branch_id
            and product_id = v_component.component_product_id
          for update;

          if not found then
            raise exception 'No se encontró inventario para el componente "%" del kit.', v_component.name;
          end if;

          if v_component_inventory.is_active is false then
            raise exception 'El componente "%" no está activo en esta sucursal.', v_component.name;
          end if;

          if v_component_inventory.has_been_stocked is not true then
            raise exception 'El componente "%" no tiene inventario inicial registrado.', v_component.name;
          end if;

          if coalesce(v_component_inventory.stock, 0) < v_component_required_qty then
            raise exception 'Stock insuficiente para el componente "%" del kit. Disponible: %, solicitado: %.',
              v_component.name,
              coalesce(v_component_inventory.stock, 0),
              v_component_required_qty;
          end if;
        end if;
      end loop;
    else
      if v_product_tracks_inventory is true then
        select stock, is_active, has_been_stocked
        into v_inventory
        from public.branch_inventory
        where branch_id = p_branch_id
          and product_id = v_product_id
        for update;

        if not found then
          raise exception 'No se encontró inventario para el producto %.', v_product_id;
        end if;

        if v_inventory.is_active is false then
          raise exception 'El producto % no está activo en esta sucursal.', v_product_id;
        end if;

        if v_inventory.has_been_stocked is not true then
          raise exception 'El producto % no tiene inventario inicial registrado.', v_product_id;
        end if;

        v_stock := coalesce(v_inventory.stock, 0);

        if v_stock < v_quantity then
          raise exception 'Stock insuficiente para el producto %. Disponible: %, solicitado: %.',
            v_product_id, v_stock, v_quantity;
        end if;
      end if;
    end if;
  end loop;

  -- VALIDACIÓN DE PAGOS
  if p_total > 0 then
    for v_payment in
      select *
      from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb))
    loop
      v_payment_method_name := v_payment ->> 'payment_method_name';
      v_amount := round(coalesce((v_payment ->> 'amount')::numeric, 0), 2);
      v_currency := upper(coalesce(v_payment ->> 'currency', 'MXN'));
      v_exchange_rate := nullif(v_payment ->> 'exchange_rate', '')::numeric;
      v_reference := nullif(btrim(coalesce(v_payment ->> 'reference', '')), '');

      if v_payment_method_name is null or btrim(v_payment_method_name) = '' then
        raise exception 'Método de pago inválido.';
      end if;

      if v_amount <= 0 then
        raise exception 'Monto de pago inválido.';
      end if;

      if v_currency = 'USD' then
        if v_exchange_rate is null or v_exchange_rate <= 0 then
          raise exception 'Tipo de cambio inválido para pago en dólares.';
        end if;

        v_total_payments := v_total_payments + round(v_amount * v_exchange_rate, 2);
      else
        v_total_payments := v_total_payments + v_amount;
      end if;

      if lower(v_payment_method_name) = lower('Transferencia') and v_reference is null then
        raise exception 'La transferencia requiere clave de rastreo o referencia.';
      end if;
    end loop;

    if round(v_total_payments, 2) < round(p_total, 2) then
      raise exception 'Los pagos no cubren el total de la venta.';
    end if;
  end if;

  begin
    insert into public.sales (
      branch_id,
      user_id,
      customer_id,
      sale_date,
      subtotal,
      tax,
      total,
      discount_total,
      status,
      client_sale_token,
      notes
    )
    values (
      p_branch_id,
      p_user_id,
      p_customer_id,
      p_sale_date,
      round(p_subtotal, 2),
      round(p_tax, 2),
      round(p_total, 2),
      0,
      'open',
      p_client_sale_token,
      nullif(btrim(p_notes), '')
    )
    returning id into v_sale_id;

  exception
    when unique_violation then
      select id
      into v_sale_id
      from public.sales
      where client_sale_token = p_client_sale_token
      limit 1;

      if v_sale_id is not null then
        return v_sale_id;
      else
        raise;
      end if;
  end;

  -- INSERTAR DETALLES Y DESCONTAR INVENTARIO
  for v_product in
    select *
    from jsonb_array_elements(p_products)
  loop
    v_product_id := (v_product ->> 'product_id')::uuid;
    v_quantity := coalesce((v_product ->> 'quantity')::numeric, 0);
    v_unit_price := round(coalesce((v_product ->> 'unit_price')::numeric, 0), 2);
    v_total_price := round(coalesce((v_product ->> 'total_price')::numeric, 0), 2);

    v_original_unit_price := round(
      coalesce((v_product ->> 'original_unit_price')::numeric, v_unit_price),
      2
    );

    v_final_unit_price := round(
      coalesce((v_product ->> 'final_unit_price')::numeric, v_unit_price),
      2
    );

    v_discount_type := nullif(
      btrim(coalesce(v_product ->> 'discount_type', '')),
      ''
    );

    v_discount_value := round(
      coalesce((v_product ->> 'discount_value')::numeric, 0),
      2
    );

    v_discount_amount := round(
      coalesce((v_product ->> 'discount_amount')::numeric, 0),
      2
    );

    v_discount_total := v_discount_total + v_discount_amount;

    select is_kit, tracks_inventory
    into v_product_is_kit, v_product_tracks_inventory
    from public.products
    where id = v_product_id;

    insert into public.sale_details (
      sale_id,
      product_id,
      branch_id,
      quantity,
      unit_price,
      total_price,
      original_unit_price,
      final_unit_price,
      discount_type,
      discount_value,
      discount_amount
    )
    values (
      v_sale_id,
      v_product_id,
      p_branch_id,
      v_quantity,
      v_unit_price,
      v_total_price,
      v_original_unit_price,
      v_final_unit_price,
      v_discount_type,
      v_discount_value,
      v_discount_amount
    )
    returning id into v_sale_detail_id;

    if v_product_is_kit is true then
      select id
      into v_kit_id
      from public.product_kits
      where kit_product_id = v_product_id;

      for v_component in
        select
          pki.component_product_id,
          pki.quantity,
          p.name,
          p.tracks_inventory
        from public.product_kit_items pki
        join public.products p on p.id = pki.component_product_id
        where pki.kit_id = v_kit_id
      loop
        v_component_required_qty := coalesce(v_component.quantity, 0) * v_quantity;

        insert into public.sale_kit_items (
          sale_id,
          sale_detail_id,
          kit_product_id,
          component_product_id,
          quantity,
          branch_id,
          created_at
        )
        values (
          v_sale_id,
          v_sale_detail_id,
          v_product_id,
          v_component.component_product_id,
          v_component_required_qty,
          p_branch_id,
          now()
        );

        if v_component.tracks_inventory is true then
          select stock
          into v_stock
          from public.branch_inventory
          where branch_id = p_branch_id
            and product_id = v_component.component_product_id;

          update public.branch_inventory
          set stock = stock - v_component_required_qty,
              updated_at = now()
          where branch_id = p_branch_id
            and product_id = v_component.component_product_id;

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
            v_component.component_product_id,
            'sale',
            -v_component_required_qty,
            v_stock,
            v_stock - v_component_required_qty,
            'Venta registrada por kit',
            v_sale_id,
            p_user_id,
            p_branch_id,
            null,
            now()
          );
        end if;
      end loop;
    else
      if v_product_tracks_inventory is true then
        select stock
        into v_stock
        from public.branch_inventory
        where branch_id = p_branch_id
          and product_id = v_product_id;

        update public.branch_inventory
        set stock = stock - v_quantity,
            updated_at = now()
        where branch_id = p_branch_id
          and product_id = v_product_id;

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
          v_product_id,
          'sale',
          -v_quantity,
          v_stock,
          v_stock - v_quantity,
          'Venta registrada',
          v_sale_id,
          p_user_id,
          p_branch_id,
          null,
          now()
        );
      end if;
    end if;
  end loop;

  -- PAGOS
  if p_total > 0 then
    for v_payment in
      select *
      from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb))
    loop
      v_payment_method_name := v_payment ->> 'payment_method_name';
      v_amount := round(coalesce((v_payment ->> 'amount')::numeric, 0), 2);
      v_currency := upper(coalesce(v_payment ->> 'currency', 'MXN'));
      v_exchange_rate := nullif(v_payment ->> 'exchange_rate', '')::numeric;
      v_reference := nullif(btrim(coalesce(v_payment ->> 'reference', '')), '');

      if v_amount <= 0 then
        continue;
      end if;

      select id
      into v_payment_method_id
      from public.payment_methods
      where lower(name) = lower(v_payment_method_name);

      if not found then
        raise exception 'No se encontró el método de pago "%".', v_payment_method_name;
      end if;

      insert into public.sale_payments (
        sale_id,
        payment_method_id,
        branch_id,
        amount,
        currency,
        exchange_rate,
        reference
      )
      values (
        v_sale_id,
        v_payment_method_id,
        p_branch_id,
        v_amount,
        v_currency,
        v_exchange_rate,
        v_reference
      );
    end loop;
  end if;

  update public.sales
  set status = 'completed',
      discount_total = round(v_discount_total, 2),
      updated_at = now()
  where id = v_sale_id;

  return v_sale_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_transfer_order(p_from_branch_id uuid, p_to_branch_id uuid, p_user_id uuid, p_notes text, p_folio text, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_transfer_id   uuid;
    v_database_ts   timestamptz := now();
    v_origin_name   text;
    v_dest_name     text;
    v_item          record;
    v_idx           integer := 0;
    v_product_id    uuid;
    v_req_qty       integer;
    v_cost_price    numeric;
    v_sale_price    numeric;
    v_reason        text;
    v_meta_folio    jsonb;
    v_notes_final   text;
    v_temp          text;
begin
    p_user_id := coalesce(auth.uid(), p_user_id);
    if p_from_branch_id is null then
        raise exception 'No hay una sucursal origen activa.';
    end if;
    if p_to_branch_id is null then
        raise exception 'Selecciona la sucursal destino.';
    end if;
    if p_user_id is null then
        raise exception 'No se detectó el usuario que genera el traspaso.';
    end if;
    if p_from_branch_id = p_to_branch_id then
        raise exception 'La sucursal destino debe ser distinta a la origen.';
    end if;
    if p_items is null or jsonb_array_length(p_items) = 0 then
        raise exception 'Agrega al menos un producto al traspaso.';
    end if;

    select name into v_origin_name from public.branches where id = p_from_branch_id;
    select name into v_dest_name   from public.branches where id = p_to_branch_id;
    v_origin_name := coalesce(v_origin_name, 'SUCURSAL ORIGEN');
    v_dest_name   := coalesce(v_dest_name,   'SUCURSAL DESTINO');

    v_meta_folio  := jsonb_build_object('folio', p_folio);
    v_notes_final := public._build_transfer_notes(p_notes, v_meta_folio);

    insert into public.inventory_transfers (
        from_branch_id, to_branch_id, user_id,
        status, notes, created_at, approved_at
    ) values (
        p_from_branch_id, p_to_branch_id, p_user_id,
        'pending_receipt', v_notes_final, v_database_ts, v_database_ts
    ) returning id into v_transfer_id;

    for v_item in select * from jsonb_array_elements(p_items) loop
        v_idx := v_idx + 1;

        v_temp       := coalesce(v_item.value ->> 'productId', v_item.value ->> 'product_id');
        v_product_id := case when btrim(coalesce(v_temp,'')) = '' then null else v_temp::uuid end;

        v_req_qty    := coalesce((v_item.value ->> 'requestedQty')::numeric,
                                 (v_item.value ->> 'quantity')::numeric, 0)::integer;
        v_cost_price := coalesce((v_item.value ->> 'costPrice')::numeric,
                                 (v_item.value ->> 'cost_price')::numeric, 0);
        v_sale_price := coalesce((v_item.value ->> 'salePrice')::numeric,
                                 (v_item.value ->> 'sale_price')::numeric, 0);

        if v_product_id is null then
            raise exception 'Producto inválido en la línea %', v_idx;
        end if;
        if v_req_qty <= 0 then
            raise exception 'Cantidad inválida en la línea %', v_idx;
        end if;

        insert into public.inventory_transfer_items (
            transfer_id, product_id, quantity, cost_price
        ) values (
            v_transfer_id, v_product_id, v_req_qty::numeric(10,3), v_cost_price
        );

        v_reason := 'TRASPASO ENVIADO A ' || p_folio || ' ' || v_dest_name;
        if p_notes is not null and length(btrim(p_notes)) > 0 then
            v_reason := v_reason || ' - ' || btrim(p_notes);
        end if;

        perform public._apply_inventory_delta(
            p_branch_id  => p_from_branch_id,
            p_product_id => v_product_id,
            p_delta      => (v_req_qty * -1)::numeric,
            p_cost_price => v_cost_price,
            p_sale_price => v_sale_price,
            p_reason     => v_reason,
            p_user_id    => p_user_id,
            p_created_at => v_database_ts
        );
    end loop;

    return jsonb_build_object(
        'success',      true,
        'transferId',   v_transfer_id,
        'folio',        p_folio,
        'itemsCount',   v_idx
    );

exception when others then
    raise exception 'create_transfer_order: % (SQLSTATE=%)', sqlerrm, sqlstate;
end;
$function$;

CREATE OR REPLACE FUNCTION public.receive_transfer_order(p_transfer_id uuid, p_destination_branch uuid, p_user_id uuid, p_username text, p_received_qty_map jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_transfer       record;
    v_origin_br_id   uuid;
    v_dest_br_id     uuid;
    v_status         text;
    v_raw_notes      text;
    v_note_text      text;
    v_meta           jsonb;
    v_sep_idx        integer;
    v_folio          text;
    v_origin_name    text;
    v_dest_name      text;
    v_database_ts    timestamptz := now();
    v_item           record;
    v_product_id     uuid;
    v_item_name      text;
    v_req_qty        integer;
    v_cost_price     numeric;
    v_sale_price     numeric;
    v_parsed_rq      numeric;
    v_received_qty   integer;
    v_returned_qty   integer;
    v_reason         text;
    v_has_diff       boolean := false;
    v_items_meta     jsonb   := '{}'::jsonb;
    v_receipt_meta   jsonb;
    v_next_status    text;
    v_notes_final    text;
    v_temp           text;
begin
    p_user_id := coalesce(auth.uid(), p_user_id);
    select t.from_branch_id, t.to_branch_id, t.status, t.notes,
           fb.name as fb_name, tb.name as tb_name
    into v_transfer
    from public.inventory_transfers t
    left join public.branches fb on fb.id = t.from_branch_id
    left join public.branches tb on tb.id = t.to_branch_id
    where t.id = p_transfer_id;

    if not found then
        raise exception 'No se encontró la orden de traspaso.';
    end if;

    v_origin_br_id := v_transfer.from_branch_id;
    v_dest_br_id   := v_transfer.to_branch_id;
    v_status       := v_transfer.status;
    v_raw_notes    := coalesce(v_transfer.notes, '');
    v_origin_name  := coalesce(v_transfer.fb_name, 'SUCURSAL ORIGEN');
    v_dest_name    := coalesce(v_transfer.tb_name, 'SUCURSAL DESTINO');

    if p_destination_branch is null or v_dest_br_id <> p_destination_branch then
        raise exception 'Esta orden no corresponde a la sucursal activa.';
    end if;
    if v_status <> 'pending_receipt' then
        raise exception 'La orden seleccionada ya fue recibida.';
    end if;

    v_sep_idx := position(chr(10)||chr(10)||'##TRANSFER_META##' in v_raw_notes);
    if v_sep_idx > 0 then
        v_note_text := btrim(substring(v_raw_notes from 1 for v_sep_idx - 1));
        v_temp      := substring(v_raw_notes from v_sep_idx
                        + length(chr(10)||chr(10)||'##TRANSFER_META##'));
        begin
            v_meta := btrim(coalesce(v_temp,'{}'))::jsonb;
            if jsonb_typeof(v_meta) <> 'object' then v_meta := '{}'::jsonb; end if;
        exception when others then
            v_meta := '{}'::jsonb;
        end;
    else
        v_note_text := btrim(v_raw_notes);
        v_meta      := '{}'::jsonb;
    end if;

    v_folio := coalesce(v_meta ->> 'folio', 'TR-SIN-FOLIO');

    for v_item in
        select
            iti.id, iti.product_id, iti.quantity, iti.cost_price,
            coalesce(p.name, 'PRODUCTO SIN NOMBRE') as p_name
        from public.inventory_transfer_items iti
        left join public.products p on p.id = iti.product_id
        where iti.transfer_id = p_transfer_id
    loop
        v_product_id := v_item.product_id;
        v_req_qty    := coalesce(v_item.quantity, 0)::integer;
        v_cost_price := coalesce(v_item.cost_price, 0);
        v_item_name  := coalesce(v_item.p_name, 'PRODUCTO SIN NOMBRE');

        select coalesce(sale_price, 0) into v_sale_price
        from public.branch_inventory
        where branch_id = v_dest_br_id and product_id = v_product_id;
        v_sale_price := coalesce(v_sale_price, 0);

        v_parsed_rq := null;
        begin
            v_parsed_rq := (p_received_qty_map ->> v_product_id::text)::numeric;
        exception when others then
            v_parsed_rq := null;
        end;
        if v_parsed_rq is null then
            v_parsed_rq := v_req_qty;
        end if;

        if v_parsed_rq < 0 or v_parsed_rq > v_req_qty then
            raise exception
                'La recepción de % debe estar entre 0 y % piezas.',
                v_item_name, v_req_qty::text;
        end if;

        v_received_qty := floor(v_parsed_rq)::integer;
        v_returned_qty := v_req_qty - v_received_qty;

        if v_received_qty > 0 then
            v_reason := 'TRASPASO RECIBIDO DE ' || v_folio || ' ' || v_origin_name;
            perform public._apply_inventory_delta(
                p_branch_id  => v_dest_br_id,
                p_product_id => v_product_id,
                p_delta      => v_received_qty::numeric,
                p_cost_price => v_cost_price,
                p_sale_price => v_sale_price,
                p_reason     => v_reason,
                p_user_id    => p_user_id,
                p_created_at => v_database_ts
            );
        end if;

        if v_returned_qty > 0 then
            v_has_diff := true;
            v_reason   := 'TRASPASO DEVOLUCION AUTOMATICA A '
                          || v_folio || ' ' || v_origin_name
                          || ' - Diferencia en recepcion hacia ' || v_dest_name;
            perform public._apply_inventory_delta(
                p_branch_id  => v_origin_br_id,
                p_product_id => v_product_id,
                p_delta      => v_returned_qty::numeric,
                p_cost_price => v_cost_price,
                p_sale_price => v_sale_price,
                p_reason     => v_reason,
                p_user_id    => p_user_id,
                p_created_at => v_database_ts
            );
        end if;

        v_items_meta := v_items_meta || jsonb_build_object(
            v_product_id::text,
            jsonb_build_object(
                'receivedQty', v_received_qty,
                'returnedQty', v_returned_qty
            )
        );
    end loop;

    v_next_status  := case when v_has_diff then 'received_with_difference'
                          else 'received_complete' end;

    v_receipt_meta := coalesce(v_meta, '{}'::jsonb)
        || jsonb_build_object(
            'receivedAt',         to_char(v_database_ts, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'receivedByUserId',   p_user_id,
            'receivedByUsername', coalesce(btrim(p_username), 'SISTEMA'),
            'itemOutcomes',       v_items_meta
        );

    v_notes_final := public._build_transfer_notes(v_note_text, v_receipt_meta);

    update public.inventory_transfers
    set status       = v_next_status,
        completed_at = v_database_ts,
        notes        = v_notes_final
    where id = p_transfer_id;

    return jsonb_build_object(
        'success',    true,
        'transferId', p_transfer_id,
        'nextStatus', v_next_status,
        'folio',      v_folio
    );

exception when others then
    raise exception 'receive_transfer_order: % (SQLSTATE=%)', sqlerrm, sqlstate;
end;
$function$;

revoke execute on function public.cancel_sale(p_sale_id uuid, p_reason text, p_refund_method_id uuid) from anon;
revoke execute on function public.cancel_sale(p_sale_id uuid, p_reason text, p_refund_method_id uuid) from public;
revoke execute on function public.cancel_sale_transaction(p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_cancel_reason text, p_refund_method_uuid uuid) from anon;
revoke execute on function public.cancel_sale_transaction(p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_cancel_reason text, p_refund_method_uuid uuid) from public;
revoke execute on function public.cancel_transfer_order(p_transfer_id uuid, p_current_branch uuid, p_user_id uuid, p_username text) from anon;
revoke execute on function public.cancel_transfer_order(p_transfer_id uuid, p_current_branch uuid, p_user_id uuid, p_username text) from public;
revoke execute on function public.close_cash_register_session(p_session_id uuid) from anon;
revoke execute on function public.close_cash_register_session(p_session_id uuid) from public;
revoke execute on function public.complete_sale(p_sale_id uuid) from anon;
revoke execute on function public.complete_sale(p_sale_id uuid) from public;
revoke execute on function public.create_partial_return_transaction(p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_return_reason text, p_refund_method_id uuid, p_items jsonb) from anon;
revoke execute on function public.create_partial_return_transaction(p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_return_reason text, p_refund_method_id uuid, p_items jsonb) from public;
revoke execute on function public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb) from anon;
revoke execute on function public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb) from public;
revoke execute on function public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid) from anon;
revoke execute on function public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid) from public;
revoke execute on function public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid, p_notes text) from anon;
revoke execute on function public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid, p_notes text) from public;
revoke execute on function public.create_transfer_order(p_from_branch_id uuid, p_to_branch_id uuid, p_user_id uuid, p_notes text, p_folio text, p_items jsonb) from anon;
revoke execute on function public.create_transfer_order(p_from_branch_id uuid, p_to_branch_id uuid, p_user_id uuid, p_notes text, p_folio text, p_items jsonb) from public;
revoke execute on function public.receive_transfer_order(p_transfer_id uuid, p_destination_branch uuid, p_user_id uuid, p_username text, p_received_qty_map jsonb) from anon;
revoke execute on function public.receive_transfer_order(p_transfer_id uuid, p_destination_branch uuid, p_user_id uuid, p_username text, p_received_qty_map jsonb) from public;
