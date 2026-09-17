-- Baseline del schema `public` del proyecto remoto, capturado con pg_dump 18.6 contra
-- PostgreSQL 17.6 (Supabase) el 17 de septiembre de 2026 (KNOWN_ISSUES #6 y #41).
--
-- Es el punto de partida de la historia de migraciones: en un entorno NUEVO se aplica primero
-- y crea las tablas base antes de que corran las migraciones de RPC. En el proyecto remoto ya
-- existente se marcó como aplicada con:
--   supabase migration repair --status applied 00000000000000
-- para que `supabase db push` no intente recrear objetos ya presentes.
--
-- Generado con: supabase db dump --linked --schema public -f <archivo>
-- No editar a mano: los cambios de schema se hacen con migraciones nuevas sobre este baseline.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."_apply_inventory_delta"("p_branch_id" "uuid", "p_product_id" "uuid", "p_delta" numeric, "p_cost_price" numeric, "p_sale_price" numeric, "p_reason" "text", "p_user_id" "uuid", "p_created_at" timestamp with time zone) RETURNS "record"
    LANGUAGE "plpgsql"
    AS $_$
declare
    v_prev_stock    numeric := 0;
    v_new_stock     numeric;
    v_inv_id        uuid;
    v_final         record;
    v_mov_table     text;
    v_delta_int     integer;
    v_cost          numeric(14,2);
    v_sale          numeric(14,2);
begin
    if p_branch_id is null or p_product_id is null then
        raise exception '_apply_inventory_delta: branch_id o product_id nulos';
    end if;

    v_delta_int := case
        when p_delta = round(p_delta) then p_delta::integer
        else round(p_delta)::integer end;

    if v_delta_int = 0 then
        select null::uuid as inv_id, 0::numeric as prev_stock,
               0::numeric as new_stock into v_final;
        return v_final;
    end if;

    v_cost := coalesce(p_cost_price, 0)::numeric(14,2);
    v_sale := coalesce(p_sale_price, 0)::numeric(14,2);

    select id, stock into v_inv_id, v_prev_stock
    from public.branch_inventory
    where branch_id = p_branch_id and product_id = p_product_id;

    if v_prev_stock is null then
        v_prev_stock := 0;
    end if;

    v_new_stock := v_prev_stock + v_delta_int;

    if v_new_stock < 0 then
        raise exception 'Stock insuficiente (previo=%, delta=%, nuevo=%)',
            v_prev_stock::text, v_delta_int::text, v_new_stock::text;
    end if;

    insert into public.branch_inventory (
        branch_id, product_id, stock,
        min_stock, max_stock, is_active, has_been_stocked,
        cost_price, sale_price,
        created_at, updated_at
    ) values (
        p_branch_id, p_product_id, greatest(0, v_new_stock),
        0, 0, true, true,
        v_cost, v_sale,
        p_created_at, p_created_at
    )
    on conflict (branch_id, product_id) do update
    set
        stock            = public.branch_inventory.stock + v_delta_int,
        is_active        = true,
        has_been_stocked = true,
        cost_price       = excluded.cost_price,
        sale_price       = excluded.sale_price,
        updated_at       = p_created_at
    returning id into v_inv_id;

    select stock into v_new_stock
    from public.branch_inventory
    where branch_id = p_branch_id and product_id = p_product_id;

    v_mov_table := null;
    foreach v_mov_table in array
        array[
            current_setting('app.inventory_movements_table', true),
            'inventory_movements','inventory_movement',
            'stock_movements','inventory_movements_log'
        ]
    loop
        if v_mov_table is null then continue; end if;
        begin
            execute format(
                'insert into public.%I (
                    sale_id, branch_id, product_id, movement_type,
                    quantity, previous_stock, new_stock, reason,
                    user_id, created_at
                 ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
                v_mov_table
            ) using
                null::uuid,
                p_branch_id,
                p_product_id,
                'adjustment',
                v_delta_int,
                v_prev_stock,
                v_new_stock,
                p_reason,
                p_user_id,
                p_created_at;
            exit;
        exception when others then
            v_mov_table := null;
        end;
    end loop;

    select v_inv_id as inv_id, v_prev_stock as prev_stock,
           v_new_stock as new_stock into v_final;
    return v_final;
end;
$_$;


ALTER FUNCTION "public"."_apply_inventory_delta"("p_branch_id" "uuid", "p_product_id" "uuid", "p_delta" numeric, "p_cost_price" numeric, "p_sale_price" numeric, "p_reason" "text", "p_user_id" "uuid", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_build_transfer_notes"("p_note_text" "text", "p_metadata" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
    v_clean_note text  := btrim(coalesce(p_note_text, ''));
    v_clean_meta jsonb := case
        when p_metadata is not null and jsonb_typeof(p_metadata) = 'object'
            and p_metadata <> '{}'::jsonb
        then p_metadata else null end;
    v_separator constant text := chr(10) || chr(10) || '##TRANSFER_META##';
begin
    if v_clean_meta is null then
        return v_clean_note;
    end if;
    return btrim(v_clean_note || v_separator || v_clean_meta::text);
end;
$$;


ALTER FUNCTION "public"."_build_transfer_notes"("p_note_text" "text", "p_metadata" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."cash_register_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "opening_amount" numeric(10,2) NOT NULL,
    "closing_amount" numeric(10,2),
    "opened_at" timestamp without time zone DEFAULT "now"(),
    "closed_at" timestamp without time zone,
    "status" character varying(20) DEFAULT 'open'::character varying,
    "difference" numeric(10,2) DEFAULT 0,
    CONSTRAINT "chk_cash_register_sessions_status" CHECK ((("status")::"text" = ANY ((ARRAY['open'::character varying, 'closed'::character varying])::"text"[])))
);


ALTER TABLE "public"."cash_register_sessions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_cash_already_open_response"("p_session" "public"."cash_register_sessions", "p_current_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_username text;
begin
  if p_session.user_id is not null then
    select username into v_username from public.users where id = p_session.user_id;
  end if;

  return jsonb_build_object(
    'success', false,
    'session', public._cash_session_payload(p_session),
    'code', case when p_session.user_id = p_current_user_id
                 then 'CASH_ALREADY_OPEN_BY_SAME_USER'
                 else 'CASH_ALREADY_OPEN_BY_OTHER_USER' end,
    'message', case when p_session.user_id = p_current_user_id
                    then 'Ya tienes una caja abierta en esta sucursal.'
                    else 'Ya existe una caja abierta en esta sucursal por '
                         || upper(coalesce(v_username, 'OTRO USUARIO'))
                         || '. Debe cerrarse antes de abrir otra caja.' end
  );
end;
$$;


ALTER FUNCTION "public"."_cash_already_open_response"("p_session" "public"."cash_register_sessions", "p_current_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_cash_max_opening_amount"() RETURNS numeric
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_raw text;
  v_cap numeric;
begin
  select (value #>> '{}')
    into v_raw
  from public.app_settings
  where key = 'cash_register.max_opening_amount';

  if v_raw is null then
    return 1000000;
  end if;

  begin
    v_cap := v_raw::numeric;
  exception when others then
    return 1000000;
  end;

  if v_cap is null or v_cap < 0 then
    return 1000000;
  end if;

  return v_cap;
end;
$$;


ALTER FUNCTION "public"."_cash_max_opening_amount"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_cash_session_payload"("p_session" "public"."cash_register_sessions") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_username text;
begin
  if p_session.id is null then
    return null;
  end if;

  if p_session.user_id is not null then
    select username into v_username from public.users where id = p_session.user_id;
  end if;

  return jsonb_build_object(
    'id', p_session.id,
    'user_id', p_session.user_id,
    'branch_id', p_session.branch_id,
    'opening_amount', p_session.opening_amount,
    'closing_amount', p_session.closing_amount,
    'difference', p_session.difference,
    'status', p_session.status,
    'opened_at', p_session.opened_at,
    'closed_at', p_session.closed_at,
    'username', v_username,
    'user', case when v_username is null then null
                 else jsonb_build_object('id', p_session.user_id, 'username', v_username) end,
    'users', case when v_username is null then null
                  else jsonb_build_object('id', p_session.user_id, 'username', v_username) end
  );
end;
$$;


ALTER FUNCTION "public"."_cash_session_payload"("p_session" "public"."cash_register_sessions") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_sale"("p_sale_id" "uuid", "p_reason" "text", "p_refund_method_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."cancel_sale"("p_sale_id" "uuid", "p_reason" "text", "p_refund_method_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_sale_transaction"("p_sale_id" "uuid", "p_user_id" "uuid", "p_branch_id" "uuid", "p_cancel_reason" "text", "p_refund_method_uuid" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."cancel_sale_transaction"("p_sale_id" "uuid", "p_user_id" "uuid", "p_branch_id" "uuid", "p_cancel_reason" "text", "p_refund_method_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_transfer_order"("p_transfer_id" "uuid", "p_current_branch" "uuid", "p_user_id" "uuid", "p_username" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."cancel_transfer_order"("p_transfer_id" "uuid", "p_current_branch" "uuid", "p_user_id" "uuid", "p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_cash_register_session"("p_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."close_cash_register_session"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_sale"("p_sale_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."complete_sale"("p_sale_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_partial_return_transaction"("p_sale_id" "uuid", "p_user_id" "uuid", "p_branch_id" "uuid", "p_return_reason" "text", "p_refund_method_id" "uuid", "p_items" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_partial_return_transaction"("p_sale_id" "uuid", "p_user_id" "uuid", "p_branch_id" "uuid", "p_return_reason" "text", "p_refund_method_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_sale_transaction"("p_branch_id" "uuid", "p_user_id" "uuid", "p_customer_id" "uuid", "p_subtotal" numeric, "p_tax" numeric, "p_total" numeric, "p_sale_date" timestamp with time zone, "p_products" "jsonb", "p_payments" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_sale_transaction"("p_branch_id" "uuid", "p_user_id" "uuid", "p_customer_id" "uuid", "p_subtotal" numeric, "p_tax" numeric, "p_total" numeric, "p_sale_date" timestamp with time zone, "p_products" "jsonb", "p_payments" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_sale_transaction"("p_branch_id" "uuid", "p_user_id" "uuid", "p_customer_id" "uuid", "p_subtotal" numeric, "p_tax" numeric, "p_total" numeric, "p_sale_date" timestamp with time zone, "p_products" "jsonb", "p_payments" "jsonb", "p_client_sale_token" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_sale_transaction"("p_branch_id" "uuid", "p_user_id" "uuid", "p_customer_id" "uuid", "p_subtotal" numeric, "p_tax" numeric, "p_total" numeric, "p_sale_date" timestamp with time zone, "p_products" "jsonb", "p_payments" "jsonb", "p_client_sale_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_sale_transaction"("p_branch_id" "uuid", "p_user_id" "uuid", "p_customer_id" "uuid", "p_subtotal" numeric, "p_tax" numeric, "p_total" numeric, "p_sale_date" timestamp with time zone, "p_products" "jsonb", "p_payments" "jsonb", "p_client_sale_token" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_sale_transaction"("p_branch_id" "uuid", "p_user_id" "uuid", "p_customer_id" "uuid", "p_subtotal" numeric, "p_tax" numeric, "p_total" numeric, "p_sale_date" timestamp with time zone, "p_products" "jsonb", "p_payments" "jsonb", "p_client_sale_token" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_transfer_order"("p_from_branch_id" "uuid", "p_to_branch_id" "uuid", "p_user_id" "uuid", "p_notes" "text", "p_folio" "text", "p_items" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_transfer_order"("p_from_branch_id" "uuid", "p_to_branch_id" "uuid", "p_user_id" "uuid", "p_notes" "text", "p_folio" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_sale_branch_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_sale_branch UUID;
  v_sale_id UUID;
  v_row_branch UUID;
BEGIN
  -- Obtener sale_id y branch_id según operación
  v_sale_id := COALESCE(NEW.sale_id, OLD.sale_id);
  v_row_branch := COALESCE(NEW.branch_id, OLD.branch_id);

  SELECT branch_id
    INTO v_sale_branch
  FROM sales
  WHERE id = v_sale_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta % no existe', v_sale_id;
  END IF;

  IF v_row_branch IS NULL THEN
    RAISE EXCEPTION 'branch_id es obligatorio para registros ligados a ventas (sale_id=%)', v_sale_id;
  END IF;

  IF v_row_branch <> v_sale_branch THEN
    RAISE EXCEPTION 'branch_id inconsistente: registro=% , venta=% (sale_id=%)',
      v_row_branch, v_sale_branch, v_sale_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_sale_branch_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_branch_by_device"("p_device_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_branch record;
begin
  if p_device_code is null or btrim(p_device_code) = '' then
    return jsonb_build_object(
      'success', false,
      'message', 'deviceCode requerido'
    );
  end if;

  select b.id, b.name, b.code
    into v_branch
  from public.pos_devices pd
  join public.branches b on b.id = pd.branch_id
  where pd.device_code = p_device_code
    and pd.is_active = true
  order by pd.id
  limit 1;

  if v_branch.id is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Este POS no está asignado a ninguna sucursal'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'branch', jsonb_build_object(
      'id', v_branch.id,
      'name', v_branch.name,
      'code', v_branch.code
    )
  );
end;
$$;


ALTER FUNCTION "public"."get_branch_by_device"("p_device_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_branch_products_paginated"("p_branch_id" "uuid", "p_search" "text" DEFAULT NULL::"text", "p_department_id" "uuid" DEFAULT NULL::"uuid", "p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 10) RETURNS TABLE("product_id" "uuid", "inventory_id" "uuid", "codigo" "text", "descripcion" "text", "departamento" "text", "costo" numeric, "precio" numeric, "existencias" numeric, "minimo" numeric, "maximo" numeric, "is_active" boolean, "has_been_stocked" boolean, "tracks_inventory" boolean, "total_count" bigint)
    LANGUAGE "plpgsql" STABLE
    AS $$
declare
  v_limit integer;
  v_offset integer;
begin
  v_limit := greatest(1, coalesce(p_page_size, 10));
  v_offset := (greatest(1, coalesce(p_page, 1)) - 1) * v_limit;

  return query
  with combined as (
    select
      p.id as product_id,
      bi.id as inventory_id,
      nullif(p.barcode, '')::text as codigo,
      upper(coalesce(p.name, ''))::text as descripcion,
      coalesce(d.name, 'Sin departamento')::text as departamento,
      coalesce(bi.cost_price, p.cost_price, 0)::numeric as costo,
      coalesce(bi.sale_price, p.sale_price, 0)::numeric as precio,
      coalesce(bi.stock, 0)::numeric as existencias,
      coalesce(bi.min_stock, 0)::numeric as minimo,
      coalesce(bi.max_stock, 0)::numeric as maximo,
      coalesce(bi.is_active, false) as is_active,
      coalesce(bi.has_been_stocked, false) as has_been_stocked,
      coalesce(p.tracks_inventory, false) as tracks_inventory
    from public.products p
    left join public.branch_inventory bi
      on bi.product_id = p.id
     and bi.branch_id = p_branch_id
    left join public.departments d
      on d.id = p.department_id
    where p.status = true
      and (bi.id is not null or p.is_global = true)
      and (
        p_search is null
        or p_search = ''
        or p.name ilike '%' || p_search || '%'
        or p.barcode ilike '%' || p_search || '%'
      )
      and (p_department_id is null or p.department_id = p_department_id)
  )
  select
    c.product_id,
    c.inventory_id,
    c.codigo,
    c.descripcion,
    c.departamento,
    c.costo,
    c.precio,
    c.existencias,
    c.minimo,
    c.maximo,
    c.is_active,
    c.has_been_stocked,
    c.tracks_inventory,
    count(*) over () as total_count
  from combined c
  order by c.tracks_inventory desc, c.descripcion asc, c.product_id asc
  limit v_limit
  offset v_offset;
end;
$$;


ALTER FUNCTION "public"."get_branch_products_paginated"("p_branch_id" "uuid", "p_search" "text", "p_department_id" "uuid", "p_page" integer, "p_page_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cash_register_session"("p_branch_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_session public.cash_register_sessions%rowtype;
begin
  if p_branch_id is null then
    return jsonb_build_object('success', false, 'session', null, 'message', 'branchId requerido');
  end if;

  select *
    into v_session
  from public.cash_register_sessions
  where branch_id = p_branch_id
    and status = 'open'
  order by opened_at desc
  limit 1;

  if v_session.id is null then
    return jsonb_build_object('success', true, 'session', null);
  end if;

  return jsonb_build_object(
    'success', true,
    'session', public._cash_session_payload(v_session)
  );
end;
$$;


ALTER FUNCTION "public"."get_cash_register_session"("p_branch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cash_report_sessions"("p_branch_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_cashier_id" "uuid" DEFAULT NULL::"uuid", "p_session_status" "text" DEFAULT NULL::"text") RETURNS TABLE("session_id" "uuid", "user_id" "uuid", "username" "text", "branch_id" "uuid", "branch_name" "text", "branch_timezone" "text", "opening_amount" numeric, "closing_amount" numeric, "opened_at" timestamp with time zone, "closed_at" timestamp with time zone, "session_status" character varying, "difference" numeric, "cash_sales" numeric, "card_sales" numeric, "total_sales" numeric, "cash_cuts" "jsonb")
    LANGUAGE "sql" STABLE
    AS $$
  WITH filtered_sessions AS (
    SELECT s.*, u.username, b.name AS branch_name, b.timezone AS branch_timezone
    FROM cash_register_sessions s
    JOIN users u ON u.id = s.user_id
    JOIN branches b ON b.id = s.branch_id
    WHERE (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND (p_cashier_id IS NULL OR s.user_id = p_cashier_id)
      AND (p_session_status IS NULL OR s.status = p_session_status)
      AND (p_start_date IS NULL OR s.opened_at >= p_start_date)
      AND (p_end_date IS NULL OR s.opened_at <= p_end_date)
    ORDER BY s.opened_at DESC
  ),
  session_payments AS (
    SELECT
      sl.user_id,
      sl.branch_id,
      sl.created_at,
      sp.amount,
      COALESCE(pm.affects_cash, false) AS affects_cash
    FROM sale_payments sp
    INNER JOIN sales sl ON sl.id = sp.sale_id
    LEFT JOIN payment_methods pm ON pm.id = sp.payment_method_id
    WHERE sl.status IN ('completed', 'partial_refund')
  )
  SELECT
    fs.id AS session_id,
    fs.user_id,
    fs.username,
    fs.branch_id,
    fs.branch_name,
    fs.branch_timezone,
    fs.opening_amount,
    fs.closing_amount,
    fs.opened_at,
    fs.closed_at,
    fs.status AS session_status,
    fs.difference,
    COALESCE(SUM(CASE WHEN sp2.affects_cash THEN sp2.amount ELSE 0 END), 0) AS cash_sales,
    COALESCE(SUM(CASE WHEN NOT sp2.affects_cash THEN sp2.amount ELSE 0 END), 0) AS card_sales,
    COALESCE(SUM(sp2.amount), 0) AS total_sales,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', cc.id, 'cut_type', cc.cut_type,
        'expected_amount', cc.expected_amount, 'counted_amount', cc.counted_amount,
        'difference', cc.difference, 'notes', cc.notes, 'created_at', cc.created_at
      ) ORDER BY cc.created_at), '[]'::jsonb)
      FROM cash_cuts cc WHERE cc.cash_register_session_id = fs.id
    ) AS cash_cuts
  FROM filtered_sessions fs
  LEFT JOIN session_payments sp2
    ON sp2.user_id = fs.user_id
    AND sp2.branch_id = fs.branch_id
    AND sp2.created_at >= fs.opened_at
    AND sp2.created_at <= COALESCE(fs.closed_at, now())
  GROUP BY fs.id, fs.user_id, fs.username, fs.branch_id, fs.branch_name,
           fs.branch_timezone, fs.opening_amount, fs.closing_amount,
           fs.opened_at, fs.closed_at, fs.status, fs.difference
  ORDER BY fs.opened_at DESC;
$$;


ALTER FUNCTION "public"."get_cash_report_sessions"("p_branch_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_cashier_id" "uuid", "p_session_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_commissions_report_data"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_branch_id" "uuid" DEFAULT NULL::"uuid", "p_cashier_id" "uuid" DEFAULT NULL::"uuid", "p_department_id" "uuid" DEFAULT NULL::"uuid", "p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT NULL::integer) RETURNS TABLE("detail_id" "uuid", "sale_id" "uuid", "ticket_number" "text", "created_at" timestamp with time zone, "branch_id" "uuid", "branch_name" "text", "cashier_id" "uuid", "cashier_name" "text", "product_id" "uuid", "barcode" character varying, "product_name" character varying, "department_id" "uuid", "department_name" "text", "quantity" integer, "unit_price" numeric, "catalog_price" numeric, "discount_amount" numeric, "discount_type" character varying, "has_discount" boolean, "total_price" numeric, "has_commission" boolean, "commission_amount" numeric, "commission_type" character varying, "commission_value" numeric, "rule_label" "text", "total_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  WITH filtered_sales AS (
    SELECT s.id, s.branch_id, s.user_id, s.created_at,
           b.name AS branch_name, u.username AS cashier_name
    FROM sales s
    JOIN branches b ON b.id = s.branch_id
    JOIN users u ON u.id = s.user_id
    WHERE s.created_at >= p_start_date
      AND s.created_at <= p_end_date
      AND s.status NOT IN ('cancelled', 'cancelada')
      AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND (p_cashier_id IS NULL OR s.user_id = p_cashier_id)
  ),
  detail_rows AS (
    SELECT
      sd.id AS detail_id, sd.sale_id, sd.product_id, sd.quantity,
      sd.unit_price, sd.discount_amount, sd.discount_type, sd.total_price,
      p.barcode, p.name AS product_name, p.sale_price AS catalog_price,
      p.department_id, p.commission_enabled, p.commission_type,
      p.commission_value, p.commission_percent,
      d.name AS department_name,
      d.commission_enabled AS dept_commission_enabled,
      d.commission_type AS dept_commission_type,
      d.commission_value AS dept_commission_value
    FROM sale_details sd
    JOIN products p ON p.id = sd.product_id
    LEFT JOIN departments d ON d.id = p.department_id
    WHERE sd.sale_id IN (SELECT id FROM filtered_sales)
      AND (p_department_id IS NULL OR p.department_id = p_department_id)
  ),
  computed AS (
    SELECT
      dr.*,
      fs.branch_id, fs.branch_name, fs.user_id AS cashier_id,
      fs.cashier_name, fs.created_at,
      upper(substring(fs.id::text, 1, 8)) AS ticket_number,
      GREATEST(COALESCE(dr.discount_amount, 0), 0) AS effective_discount,
      CASE
        WHEN dr.commission_enabled THEN
          CASE dr.commission_type
            WHEN 'percent' THEN dr.unit_price * dr.quantity * (COALESCE(dr.commission_percent, dr.commission_value, 0) / 100.0)
            ELSE COALESCE(dr.commission_value, 0) * dr.quantity
          END
        WHEN dr.dept_commission_enabled THEN
          CASE dr.dept_commission_type
            WHEN 'percent' THEN dr.unit_price * dr.quantity * (COALESCE(dr.dept_commission_value, 0) / 100.0)
            ELSE COALESCE(dr.dept_commission_value, 0) * dr.quantity
          END
        ELSE 0
      END AS commission_amount,
      (dr.commission_enabled OR dr.dept_commission_enabled) AS has_commission
    FROM detail_rows dr
    JOIN filtered_sales fs ON fs.id = dr.sale_id
  )
  SELECT
    c.detail_id, c.sale_id, c.ticket_number, c.created_at,
    c.branch_id, c.branch_name, c.cashier_id, c.cashier_name,
    c.product_id, c.barcode, c.product_name,
    c.department_id, c.department_name,
    c.quantity, c.unit_price, c.catalog_price,
    c.effective_discount AS discount_amount, c.discount_type,
    c.effective_discount > 0 AS has_discount,
    c.total_price,
    c.has_commission, c.commission_amount,
    c.commission_type, c.commission_value,
    CASE
      WHEN c.has_commission THEN
        c.commission_type || ': ' || c.commission_value ||
        CASE WHEN c.commission_type = 'percent' THEN '%' ELSE '' END
      ELSE 'Sin comision'
    END AS rule_label,
    count(*) OVER () AS total_count
  FROM computed c
  ORDER BY c.created_at DESC
  LIMIT (CASE WHEN p_page_size IS NULL THEN NULL ELSE p_page_size END)
  OFFSET (CASE WHEN p_page_size IS NULL THEN 0 ELSE (COALESCE(p_page, 1) - 1) * p_page_size END);
$$;


ALTER FUNCTION "public"."get_commissions_report_data"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_branch_id" "uuid", "p_cashier_id" "uuid", "p_department_id" "uuid", "p_page" integer, "p_page_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_email_by_username"("p_username" "text") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select u.email
  from public.users u
  where lower(u.username) = lower(p_username)
    and u.status = true
  limit 1;
$$;


ALTER FUNCTION "public"."get_email_by_username"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_inventory_report_data"("p_branch_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("product_id" "uuid", "inventory_id" "uuid", "barcode" character varying, "product_name" character varying, "cost_price" numeric, "sale_price" numeric, "tracks_inventory" boolean, "is_kit" boolean, "department_id" "uuid", "department_name" "text", "stock" numeric, "min_stock" numeric, "max_stock" numeric, "total_cost" numeric, "total_sale" numeric, "has_been_stocked" boolean, "has_inventory_record" boolean, "single_branch_cost" numeric, "single_branch_sale" numeric, "suggested_qty" integer, "estimated_investment" numeric, "status" "text", "status_label" "text")
    LANGUAGE "sql" STABLE
    AS $$
  WITH inv AS (
    SELECT
      bi.product_id,
      bi.id AS inventory_id,
      bi.branch_id,
      bi.stock, bi.min_stock, bi.max_stock,
      bi.cost_price, bi.sale_price,
      bi.is_active, bi.has_been_stocked
    FROM branch_inventory bi
    WHERE bi.is_active = true
      AND (p_branch_id IS NULL OR bi.branch_id = p_branch_id)
  ),
  agg AS (
    SELECT
      product_id,
      (array_agg(inventory_id ORDER BY inventory_id))[1] AS inventory_id,
      SUM(stock) AS stock,
      SUM(min_stock) AS min_stock,
      SUM(max_stock) AS max_stock,
      SUM(CASE WHEN stock > 0 THEN stock * cost_price ELSE 0 END) AS total_cost,
      SUM(CASE WHEN stock > 0 THEN stock * sale_price ELSE 0 END) AS total_sale,
      BOOL_OR(has_been_stocked) AS has_been_stocked,
      (array_agg(CASE WHEN p_branch_id IS NOT NULL THEN cost_price END ORDER BY cost_price NULLS LAST))[1] AS single_branch_cost,
      (array_agg(CASE WHEN p_branch_id IS NOT NULL THEN sale_price END ORDER BY sale_price NULLS LAST))[1] AS single_branch_sale
    FROM inv
    GROUP BY product_id
  )
  SELECT
    p.id AS product_id,
    a.inventory_id,
    p.barcode,
    p.name AS product_name,
    COALESCE(
      CASE WHEN a.stock > 0 AND a.total_cost > 0 THEN a.total_cost / a.stock ELSE NULL END,
      a.single_branch_cost, p.cost_price
    ) AS cost_price,
    COALESCE(
      CASE WHEN a.stock > 0 AND a.total_sale > 0 THEN a.total_sale / a.stock ELSE NULL END,
      a.single_branch_sale, p.sale_price
    ) AS sale_price,
    COALESCE(p.tracks_inventory, true) AND NOT p.is_kit AS tracks_inventory,
    p.is_kit,
    p.department_id,
    COALESCE(d.name, 'Sin departamento') AS department_name,
    COALESCE(a.stock, 0) AS stock,
    COALESCE(a.min_stock, 0) AS min_stock,
    COALESCE(a.max_stock, 0) AS max_stock,
    COALESCE(a.total_cost, 0) AS total_cost,
    COALESCE(a.total_sale, 0) AS total_sale,
    COALESCE(a.has_been_stocked, false) AS has_been_stocked,
    (a.inventory_id IS NOT NULL) AS has_inventory_record,
    a.single_branch_cost,
    a.single_branch_sale,
    CASE
      WHEN COALESCE(p.tracks_inventory, true) AND NOT p.is_kit
        AND (COALESCE(a.stock, 0) <= 0 OR COALESCE(a.stock, 0) <= COALESCE(a.min_stock, 0))
      THEN
        CASE
          WHEN COALESCE(a.max_stock, 0) > 0 THEN (a.max_stock - COALESCE(a.stock, 0))::integer
          WHEN COALESCE(a.min_stock, 0) > 0 THEN ((a.min_stock * 2) - COALESCE(a.stock, 0))::integer
          ELSE 1
        END
      ELSE 0
    END AS suggested_qty,
    0 AS estimated_investment,
    CASE
      WHEN NOT COALESCE(p.tracks_inventory, true) OR p.is_kit THEN 'no_control'
      WHEN NOT COALESCE(a.has_been_stocked, false) AND COALESCE(a.stock, 0) <= 0 THEN 'not_stocked'
      WHEN COALESCE(a.stock, 0) <= 0 THEN 'exhausted'
      WHEN COALESCE(a.min_stock, 0) > 0 AND COALESCE(a.stock, 0) <= COALESCE(a.min_stock, 0) THEN 'low'
      WHEN COALESCE(a.max_stock, 0) > 0 AND COALESCE(a.stock, 0) > COALESCE(a.max_stock, 0) THEN 'excess'
      ELSE 'optimal'
    END AS status,
    CASE
      WHEN NOT COALESCE(p.tracks_inventory, true) OR p.is_kit THEN
        CASE WHEN p.is_kit THEN 'Kit' ELSE 'Sin control' END
      WHEN NOT COALESCE(a.has_been_stocked, false) AND COALESCE(a.stock, 0) <= 0 THEN 'No surtido'
      WHEN COALESCE(a.stock, 0) <= 0 THEN 'Agotado'
      WHEN COALESCE(a.min_stock, 0) > 0 AND COALESCE(a.stock, 0) <= COALESCE(a.min_stock, 0) THEN 'Stock Bajo'
      WHEN COALESCE(a.max_stock, 0) > 0 AND COALESCE(a.stock, 0) > COALESCE(a.max_stock, 0) THEN 'Exceso'
      ELSE 'Optimo'
    END AS status_label
  FROM products p
  LEFT JOIN agg a ON a.product_id = p.id
  LEFT JOIN departments d ON d.id = p.department_id
  WHERE p.status = true
    AND (a.inventory_id IS NOT NULL OR p.is_global = true)
  ORDER BY p.name ASC;
$$;


ALTER FUNCTION "public"."get_inventory_report_data"("p_branch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sales_report_kpis"("p_start" timestamp with time zone, "p_end" timestamp with time zone, "p_branch" "uuid" DEFAULT NULL::"uuid", "p_cashier" "uuid" DEFAULT NULL::"uuid", "p_status" "text" DEFAULT 'Todos'::"text", "p_payment" "text" DEFAULT 'Todos'::"text", "p_discount" "text" DEFAULT 'Todos'::"text") RETURNS TABLE("total_income" numeric, "total_discounts" numeric, "total_tickets" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN computed_status = 'Completada' THEN total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN computed_status = 'Completada' THEN discount_total ELSE 0 END), 0),
    COUNT(id)
  FROM v_sales_report_list
  WHERE created_at >= p_start AND created_at <= p_end
  AND (p_branch IS NULL OR branch_id = p_branch)
  AND (p_cashier IS NULL OR user_id = p_cashier)
  AND (p_status = 'Todos' OR computed_status = p_status)
  AND (p_payment = 'Todos' OR payment_method = p_payment)
  AND (p_discount = 'Todos' OR discount_filter = p_discount);
END;
$$;


ALTER FUNCTION "public"."get_sales_report_kpis"("p_start" timestamp with time zone, "p_end" timestamp with time zone, "p_branch" "uuid", "p_cashier" "uuid", "p_status" "text", "p_payment" "text", "p_discount" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("p_name" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.role_permissions rp ON rp.role_id = u.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE u.id = auth.uid()
      AND u.status = true
      AND p.name = p_name
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.name = p_name
  );
$$;


ALTER FUNCTION "public"."has_permission"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
      AND u.status = true
      AND r.name = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."open_cash_register"("p_branch_id" "uuid", "p_opening_amount" numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_session public.cash_register_sessions%rowtype;
  v_amount numeric := coalesce(p_opening_amount, 0);
  v_cap numeric := public._cash_max_opening_amount();
  v_new public.cash_register_sessions%rowtype;
begin
  if p_branch_id is null then
    return jsonb_build_object('success', false, 'message', 'branchId requerido');
  end if;

  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'userId requerido');
  end if;

  if v_amount < 0 then
    return jsonb_build_object(
      'success', false,
      'code', 'CASH_INVALID_AMOUNT',
      'message', 'openingAmount inválido'
    );
  end if;

  if v_amount > v_cap then
    return jsonb_build_object(
      'success', false,
      'code', 'CASH_INVALID_AMOUNT',
      'message', 'El monto de apertura no puede superar ' || v_cap::text || '.'
    );
  end if;

  select *
    into v_session
  from public.cash_register_sessions
  where branch_id = p_branch_id
    and status = 'open'
  order by opened_at desc
  limit 1;

  if v_session.id is not null then
    return public._cash_already_open_response(v_session, v_user_id);
  end if;

  insert into public.cash_register_sessions (branch_id, user_id, opening_amount, opened_at, status)
  values (p_branch_id, v_user_id, v_amount, now(), 'open')
  returning * into v_new;

  return jsonb_build_object('success', true, 'session', public._cash_session_payload(v_new));

exception
  when unique_violation then
    -- Otra transacción abrió la caja en paralelo (índice único por sucursal abierta).
    select *
      into v_session
    from public.cash_register_sessions
    where branch_id = p_branch_id
      and status = 'open'
    order by opened_at desc
    limit 1;

    if v_session.id is null then
      return jsonb_build_object(
        'success', false,
        'code', 'CASH_ALREADY_OPEN',
        'message', 'Ya existe una caja abierta en esta sucursal.'
      );
    end if;

    return public._cash_already_open_response(v_session, v_user_id);
end;
$$;


ALTER FUNCTION "public"."open_cash_register"("p_branch_id" "uuid", "p_opening_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_edit_if_sale_not_open"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_status TEXT;
  v_sale_id UUID;
BEGIN
  -- Determinar sale_id según la tabla (NEW o OLD)
  v_sale_id := COALESCE(NEW.sale_id, OLD.sale_id);

  SELECT status INTO v_status
  FROM sales
  WHERE id = v_sale_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta % no existe', v_sale_id;
  END IF;

  IF v_status <> 'open' THEN
    RAISE EXCEPTION 'No se permite modificar. Venta % no está open (estado actual: %)', v_sale_id, v_status;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_edit_if_sale_not_open"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."receive_transfer_order"("p_transfer_id" "uuid", "p_destination_branch" "uuid", "p_user_id" "uuid", "p_username" "text", "p_received_qty_map" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."receive_transfer_order"("p_transfer_id" "uuid", "p_destination_branch" "uuid", "p_user_id" "uuid", "p_username" "text", "p_received_qty_map" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "entity" character varying(50) NOT NULL,
    "entity_id" "uuid",
    "action" character varying(50) NOT NULL,
    "description" character varying(255),
    "old_values" "jsonb",
    "new_values" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."branch_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "stock" numeric(10,3) DEFAULT 0 NOT NULL,
    "min_stock" numeric(10,3),
    "max_stock" numeric(10,3),
    "is_active" boolean DEFAULT true,
    "cost_price" numeric(10,2) NOT NULL,
    "sale_price" numeric(10,2) NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "has_been_stocked" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_branch_inventory_stock_nonnegative" CHECK (("stock" >= (0)::numeric))
);


ALTER TABLE "public"."branch_inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(20) NOT NULL,
    "name" character varying(100) NOT NULL,
    "phone" character varying(20),
    "email" character varying(100),
    "address" "text",
    "city" character varying(50),
    "state" character varying(50),
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "timezone" "text" DEFAULT 'America/Cancun'::"text" NOT NULL
);


ALTER TABLE "public"."branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."canceled_sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "cancel_reason" "text" NOT NULL,
    "refund_amount" numeric(10,2),
    "canceled_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "refund_method_id" "uuid",
    "branch_id" "uuid" NOT NULL
);


ALTER TABLE "public"."canceled_sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_cut_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cash_cut_id" "uuid" NOT NULL,
    "payment_method_id" "uuid" NOT NULL,
    "expected_amount" numeric(12,2) NOT NULL,
    "counted_amount" numeric(12,2) NOT NULL,
    "difference" numeric(12,2) NOT NULL
);


ALTER TABLE "public"."cash_cut_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_cuts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "cash_register_session_id" "uuid",
    "cut_type" character varying(20) NOT NULL,
    "expected_amount" numeric(12,2) NOT NULL,
    "counted_amount" numeric(12,2) NOT NULL,
    "difference" numeric(12,2) NOT NULL,
    "notes" "text",
    "cut_date" "date" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "cash_cuts_cut_type_check" CHECK ((("cut_type")::"text" = ANY ((ARRAY['partial'::character varying, 'final'::character varying, 'shift'::character varying])::"text"[])))
);


ALTER TABLE "public"."cash_cuts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "movement_type" character varying(20) NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "description" "text",
    "branch_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cash_movements_type_check" CHECK ((("movement_type")::"text" = ANY ((ARRAY['entrada'::character varying, 'salida'::character varying])::"text"[]))),
    CONSTRAINT "chk_cash_movements_amount_pos" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."cash_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cfdi_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" character varying(50) DEFAULT 'facturama'::character varying NOT NULL,
    "environment" character varying(20) DEFAULT 'sandbox'::character varying NOT NULL,
    "issuer_rfc" character varying(13) NOT NULL,
    "issuer_name" character varying(255) NOT NULL,
    "issuer_tax_regime" character varying(5) NOT NULL,
    "issuer_postal_code" character varying(10) NOT NULL,
    "invoice_series" character varying(10) DEFAULT 'A'::character varying,
    "next_folio" integer DEFAULT 1,
    "api_username" "text",
    "api_password" "text",
    "api_token" "text",
    "status" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "connection_status" character varying(30) DEFAULT 'not_configured'::character varying,
    "last_connection_test" timestamp without time zone,
    "timbres_available" integer DEFAULT 0,
    "last_timbres_sync" timestamp without time zone
);


ALTER TABLE "public"."cfdi_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cfdi_uses" (
    "id" character varying(5) NOT NULL,
    "description" character varying(255) NOT NULL,
    "status" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."cfdi_uses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_points" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "points" integer NOT NULL,
    "movement_type" character varying(20) NOT NULL,
    "source" character varying(20) NOT NULL,
    "related_sale_id" "uuid",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "user_id" "uuid",
    "branch_id" "uuid",
    "reward_id" "uuid",
    "notes" "text",
    CONSTRAINT "chk_customer_points_movement_type" CHECK ((("movement_type")::"text" = ANY ((ARRAY['earn'::character varying, 'redeem'::character varying])::"text"[]))),
    CONSTRAINT "chk_customer_points_source" CHECK ((("source")::"text" = ANY ((ARRAY['sale'::character varying, 'reward'::character varying, 'manual'::character varying, 'cancellation'::character varying, 'partial_return'::character varying])::"text"[])))
);


ALTER TABLE "public"."customer_points" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "reward_id" "uuid" NOT NULL,
    "points_used" integer NOT NULL,
    "redeemed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "user_id" "uuid",
    "branch_id" "uuid",
    CONSTRAINT "chk_customer_rewards_points_used" CHECK (("points_used" > 0))
);


ALTER TABLE "public"."customer_rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(150),
    "phone" character varying(20),
    "email" character varying(120),
    "rfc" character varying(13),
    "address" "text",
    "razon_social" character varying(200),
    "cfdi_use" character varying(5),
    "status" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "fiscal_email" character varying(120),
    "postal_code" character varying(10),
    "tax_regime" character varying(3),
    "is_billing_customer" boolean DEFAULT false,
    "is_points_customer" boolean DEFAULT false
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "status" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "commission_enabled" boolean DEFAULT false,
    "commission_type" character varying DEFAULT 'percent'::character varying,
    "commission_value" numeric DEFAULT 0.00
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_adjustments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "previous_stock" numeric(10,3) NOT NULL,
    "new_stock" numeric(10,3) NOT NULL,
    "difference" numeric(10,3) NOT NULL,
    "reason" character varying(50) NOT NULL,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."inventory_adjustments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "movement_type" character varying(20) NOT NULL,
    "quantity" integer NOT NULL,
    "previous_stock" integer NOT NULL,
    "new_stock" integer NOT NULL,
    "reason" "text",
    "sale_id" "uuid",
    "user_id" "uuid",
    "branch_id" "uuid" NOT NULL,
    "related_branch_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "chk_inventory_movement_quantity" CHECK (("quantity" <> 0)),
    CONSTRAINT "chk_inventory_movement_stock" CHECK (("new_stock" = ("previous_stock" + "quantity"))),
    CONSTRAINT "chk_inventory_movements_movement_type" CHECK ((("movement_type")::"text" = ANY ((ARRAY['sale'::character varying, 'canceled'::character varying, 'return'::character varying, 'adjustment'::character varying, 'transfer'::character varying])::"text"[]))),
    CONSTRAINT "chk_inventory_movements_new_stock_nonneg" CHECK (("new_stock" >= 0)),
    CONSTRAINT "chk_inventory_movements_prev_stock_nonneg" CHECK (("previous_stock" >= 0)),
    CONSTRAINT "chk_inventory_movements_quantity_nonzero" CHECK (("quantity" <> 0))
);


ALTER TABLE "public"."inventory_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_transfer_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transfer_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" numeric(10,3) NOT NULL,
    "cost_price" numeric(10,2) NOT NULL
);


ALTER TABLE "public"."inventory_transfer_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_transfers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_branch_id" "uuid" NOT NULL,
    "to_branch_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "approved_at" timestamp without time zone,
    "completed_at" timestamp without time zone
);


ALTER TABLE "public"."inventory_transfers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "quantity" numeric(10,3) NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "discount" numeric(10,2) DEFAULT 0,
    "tax_rate" numeric(5,2) NOT NULL,
    "tax_amount" numeric(10,2) NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "description" character varying(255) NOT NULL,
    "clave_prod_serv" character varying(20) NOT NULL
);


ALTER TABLE "public"."invoice_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "payment_method_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" character varying(10) DEFAULT 'MXN'::character varying,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."invoice_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "uuid" character varying(36),
    "serie" character varying(10),
    "folio" integer,
    "invoice_date" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "cfdi_use" character varying(5) NOT NULL,
    "payment_method" character varying(5) NOT NULL,
    "payment_form" character varying(5) NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    "tax" numeric(10,2) NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "xml_url" "text",
    "pdf_url" "text",
    "is_canceled" boolean DEFAULT false,
    "canceled_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "branch_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    CONSTRAINT "chk_invoices_payment_method" CHECK ((("payment_method")::"text" = ANY ((ARRAY['PUE'::character varying, 'PPD'::character varying])::"text"[]))),
    CONSTRAINT "chk_payment_method" CHECK ((("payment_method")::"text" = ANY ((ARRAY['PUE'::character varying, 'PPD'::character varying])::"text"[])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_forms_sat" (
    "code" character varying(5) NOT NULL,
    "description" character varying(100) NOT NULL,
    "status" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."payment_forms_sat" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(50) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "affects_cash" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_code" "text" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."pos_devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."postal_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "postal_code" character varying(5) NOT NULL,
    "settlement" character varying(150) NOT NULL,
    "settlement_type" character varying(100),
    "municipality" character varying(150) NOT NULL,
    "state" character varying(150) NOT NULL,
    "city" character varying(150),
    "status" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "zone_type" character varying(50)
);


ALTER TABLE "public"."postal_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."price_changes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "affected_branch_id" "uuid" NOT NULL,
    "old_price" numeric(10,2) NOT NULL,
    "new_price" numeric(10,2) NOT NULL,
    "cost_price" numeric(10,2),
    "changed_by" "uuid" NOT NULL,
    "reason" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."price_changes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_discounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "discount_percent" numeric DEFAULT 0 NOT NULL,
    "discount_concept" character varying,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_discounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_kit_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kit_id" "uuid" NOT NULL,
    "component_product_id" "uuid" NOT NULL,
    "quantity" numeric(10,3) NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_kit_items_quantity_check" CHECK (("quantity" > (0)::numeric))
);


ALTER TABLE "public"."product_kit_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_kits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kit_product_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_kits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "barcode" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "sale_type" character varying(20) NOT NULL,
    "department_id" "uuid",
    "unit" character varying(20) NOT NULL,
    "cost_price" numeric(10,2) NOT NULL,
    "sale_price" numeric(10,2) NOT NULL,
    "profit" numeric(10,2) GENERATED ALWAYS AS (("sale_price" - "cost_price")) STORED,
    "tax" numeric(5,2) DEFAULT 16.00,
    "commission_enabled" boolean DEFAULT false,
    "commission_percent" numeric(5,2) DEFAULT 0.00,
    "clave_sat" character varying(8),
    "status" boolean DEFAULT true,
    "is_global" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "is_kit" boolean DEFAULT false NOT NULL,
    "tracks_inventory" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "commission_type" character varying DEFAULT 'percent'::character varying,
    "commission_value" numeric DEFAULT 0.00,
    "max_kits_per_sale" integer DEFAULT 1,
    CONSTRAINT "chk_products_cost_price_nonneg" CHECK (("cost_price" >= (0)::numeric)),
    CONSTRAINT "chk_products_sale_price_nonneg" CHECK (("sale_price" >= (0)::numeric)),
    CONSTRAINT "products_max_kits_per_sale_check" CHECK (("max_kits_per_sale" >= 1))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reward_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reward_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reward_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "points_required" integer NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "reward_type" "text" DEFAULT 'external'::"text" NOT NULL,
    "reward_quantity" integer DEFAULT 1 NOT NULL,
    "discount_type" "text",
    "discount_value" numeric,
    CONSTRAINT "rewards_discount_type_check" CHECK ((("discount_type" IS NULL) OR ("discount_type" = ANY (ARRAY['percent'::"text", 'fixed'::"text"])))),
    CONSTRAINT "rewards_discount_value_check" CHECK ((("discount_value" IS NULL) OR ("discount_value" >= (0)::numeric))),
    CONSTRAINT "rewards_reward_quantity_check" CHECK (("reward_quantity" > 0)),
    CONSTRAINT "rewards_reward_type_check" CHECK (("reward_type" = ANY (ARRAY['free_product'::"text", 'product_discount'::"text"])))
);


ALTER TABLE "public"."rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(50) NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "status" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,
    "original_unit_price" numeric,
    "final_unit_price" numeric,
    "discount_type" character varying(20),
    "discount_value" numeric DEFAULT 0,
    "discount_amount" numeric DEFAULT 0,
    CONSTRAINT "chk_sale_details_quantity_pos" CHECK (("quantity" > 0)),
    CONSTRAINT "chk_sale_details_quantity_positive" CHECK (("quantity" > 0)),
    CONSTRAINT "chk_sale_details_total_price" CHECK (("total_price" = (("quantity")::numeric * "unit_price"))),
    CONSTRAINT "chk_sale_details_total_price_nonneg" CHECK (("total_price" >= (0)::numeric)),
    CONSTRAINT "chk_sale_details_unit_price_nonneg" CHECK (("unit_price" >= (0)::numeric)),
    CONSTRAINT "sale_details_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."sale_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_kit_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "sale_detail_id" "uuid" NOT NULL,
    "kit_product_id" "uuid" NOT NULL,
    "component_product_id" "uuid" NOT NULL,
    "quantity" numeric(10,3) NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sale_kit_items_quantity_check" CHECK (("quantity" > (0)::numeric))
);


ALTER TABLE "public"."sale_kit_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "payment_method_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" character varying(10) DEFAULT 'MXN'::character varying,
    "exchange_rate" numeric(10,4) DEFAULT 1,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "reference" "text",
    CONSTRAINT "chk_sale_payments_amount_pos" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "chk_sale_payments_amount_positive" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "chk_sale_payments_exchange_rate_pos" CHECK (("exchange_rate" >= 0.0001)),
    CONSTRAINT "sale_payments_currency_check" CHECK ((("currency")::"text" = ANY ((ARRAY['MXN'::character varying, 'USD'::character varying])::"text"[])))
);


ALTER TABLE "public"."sale_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_return_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "return_id" "uuid" NOT NULL,
    "sale_detail_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" numeric NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_quantity_positive" CHECK (("quantity" > (0)::numeric))
);


ALTER TABLE "public"."sale_return_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_returns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "return_reason" "text" NOT NULL,
    "refund_method_id" "uuid" NOT NULL,
    "total_refund" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sale_returns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_reward_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "sale_detail_id" "uuid",
    "customer_id" "uuid" NOT NULL,
    "reward_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "branch_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "quantity" numeric DEFAULT 1 NOT NULL,
    "points_per_unit" integer NOT NULL,
    "total_points" integer NOT NULL,
    "unit_price" numeric DEFAULT 0 NOT NULL,
    "discount_amount" numeric DEFAULT 0 NOT NULL,
    "reward_name" "text" NOT NULL,
    "product_name" "text",
    "status" "text" DEFAULT 'applied'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reversed_at" timestamp with time zone,
    "reversed_by" "uuid",
    "reversal_reason" "text",
    CONSTRAINT "sale_reward_redemptions_discount_amount_check" CHECK (("discount_amount" >= (0)::numeric)),
    CONSTRAINT "sale_reward_redemptions_points_per_unit_check" CHECK (("points_per_unit" > 0)),
    CONSTRAINT "sale_reward_redemptions_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "sale_reward_redemptions_status_check" CHECK (("status" = ANY (ARRAY['applied'::"text", 'cancelled'::"text", 'refunded'::"text"]))),
    CONSTRAINT "sale_reward_redemptions_total_points_check" CHECK (("total_points" > 0)),
    CONSTRAINT "sale_reward_redemptions_unit_price_check" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."sale_reward_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "branch_id" "uuid" NOT NULL,
    "sale_date" timestamp with time zone DEFAULT "now"(),
    "subtotal" numeric(10,2) NOT NULL,
    "tax" numeric(5,2) DEFAULT 16.00,
    "total" numeric(10,2) NOT NULL,
    "status" character varying(20) DEFAULT 'completed'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "client_sale_token" "uuid",
    "notes" "text",
    "discount_total" numeric DEFAULT 0,
    CONSTRAINT "chk_sales_status" CHECK ((("status")::"text" = ANY ((ARRAY['open'::character varying, 'completed'::character varying, 'cancelled'::character varying])::"text"[]))),
    CONSTRAINT "sales_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['open'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'refunded'::character varying])::"text"[])))
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sales"."notes" IS 'Notas generales de la venta o ticket, capturadas al momento de registrar la venta.';



CREATE TABLE IF NOT EXISTS "public"."sat_claves_productos_servicios" (
    "clave" character varying(8) NOT NULL,
    "descripcion" "text" NOT NULL,
    "status" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."sat_claves_productos_servicios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_key" character varying(100) NOT NULL,
    "setting_value" "text" NOT NULL,
    "value_type" character varying(20) NOT NULL,
    "description" "text",
    "branch_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "system_settings_value_type_check" CHECK ((("value_type")::"text" = ANY ((ARRAY['string'::character varying, 'number'::character varying, 'boolean'::character varying, 'json'::character varying])::"text"[])))
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tax_regimes" (
    "id" character varying(3) NOT NULL,
    "description" character varying(255) NOT NULL,
    "status" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."tax_regimes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "access_level" character varying(10) DEFAULT 'view'::character varying NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_branches_access_level_check" CHECK ((("access_level")::"text" = ANY ((ARRAY['view'::character varying, 'operate'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "assigned_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "session_token" character varying(255) NOT NULL,
    "ip_address" character varying(45),
    "user_agent" "text",
    "started_at" timestamp without time zone DEFAULT "now"(),
    "ended_at" timestamp without time zone,
    "status" character varying(20) DEFAULT 'active'::character varying,
    CONSTRAINT "user_sessions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'ended'::character varying, 'expired'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "username" character varying(50) NOT NULL,
    "role_id" "uuid" NOT NULL,
    "status" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "email" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_sales_report_list" WITH ("security_invoker"='on') AS
 SELECT "s"."id",
    "s"."created_at",
    "s"."total",
    "s"."discount_total",
    "s"."notes",
    "s"."branch_id",
    "s"."user_id",
    "b"."name" AS "branch_name",
    "u"."username" AS "cashier_name",
    "c"."name" AS "customer_name",
        CASE
            WHEN (( SELECT "count"(*) AS "count"
               FROM "public"."sale_payments" "sp"
              WHERE ("sp"."sale_id" = "s"."id")) > 1) THEN 'Mixto'::"text"
            ELSE 'Efectivo'::"text"
        END AS "payment_method",
        CASE
            WHEN (("s"."status")::"text" = 'cancelled'::"text") THEN 'Cancelada'::"text"
            WHEN ((("s"."status")::"text" = 'completed'::"text") AND (EXISTS ( SELECT 1
               FROM "public"."sale_returns" "sr"
              WHERE ("sr"."sale_id" = "s"."id")))) THEN 'Devolución Parcial'::"text"
            WHEN (("s"."status")::"text" = 'completed'::"text") THEN 'Completada'::"text"
            ELSE 'Pendiente'::"text"
        END AS "computed_status",
        CASE
            WHEN ("s"."discount_total" > (0)::numeric) THEN 'ConDescuento'::"text"
            ELSE 'SinDescuento'::"text"
        END AS "discount_filter"
   FROM ((("public"."sales" "s"
     LEFT JOIN "public"."branches" "b" ON (("s"."branch_id" = "b"."id")))
     LEFT JOIN "public"."users" "u" ON (("s"."user_id" = "u"."id")))
     LEFT JOIN "public"."customers" "c" ON (("s"."customer_id" = "c"."id")));


ALTER VIEW "public"."v_sales_report_list" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."branch_inventory"
    ADD CONSTRAINT "branch_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."canceled_sales"
    ADD CONSTRAINT "canceled_sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_cut_details"
    ADD CONSTRAINT "cash_cut_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_cuts"
    ADD CONSTRAINT "cash_cuts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_movements"
    ADD CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_register_sessions"
    ADD CONSTRAINT "cash_register_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cfdi_settings"
    ADD CONSTRAINT "cfdi_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cfdi_uses"
    ADD CONSTRAINT "cfdi_uses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_points"
    ADD CONSTRAINT "customer_points_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_rewards"
    ADD CONSTRAINT "customer_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_rfc_key" UNIQUE ("rfc");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_transfer_items"
    ADD CONSTRAINT "inventory_transfer_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_transfers"
    ADD CONSTRAINT "inventory_transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_payments"
    ADD CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_sale_id_key" UNIQUE ("sale_id");



ALTER TABLE ONLY "public"."payment_forms_sat"
    ADD CONSTRAINT "payment_forms_sat_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_devices"
    ADD CONSTRAINT "pos_devices_device_code_key" UNIQUE ("device_code");



ALTER TABLE ONLY "public"."pos_devices"
    ADD CONSTRAINT "pos_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."postal_codes"
    ADD CONSTRAINT "postal_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_changes"
    ADD CONSTRAINT "price_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_discounts"
    ADD CONSTRAINT "product_discounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_discounts"
    ADD CONSTRAINT "product_discounts_product_id_key" UNIQUE ("product_id");



ALTER TABLE ONLY "public"."product_kit_items"
    ADD CONSTRAINT "product_kit_items_kit_id_component_product_id_key" UNIQUE ("kit_id", "component_product_id");



ALTER TABLE ONLY "public"."product_kit_items"
    ADD CONSTRAINT "product_kit_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_kits"
    ADD CONSTRAINT "product_kits_kit_product_id_key" UNIQUE ("kit_product_id");



ALTER TABLE ONLY "public"."product_kits"
    ADD CONSTRAINT "product_kits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_barcode_key" UNIQUE ("barcode");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reward_products"
    ADD CONSTRAINT "reward_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reward_products"
    ADD CONSTRAINT "reward_products_reward_id_product_id_key" UNIQUE ("reward_id", "product_id");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_details"
    ADD CONSTRAINT "sale_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_kit_items"
    ADD CONSTRAINT "sale_kit_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_payments"
    ADD CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_return_items"
    ADD CONSTRAINT "sale_return_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_returns"
    ADD CONSTRAINT "sale_returns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_reward_redemptions"
    ADD CONSTRAINT "sale_reward_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_client_sale_token_key" UNIQUE ("client_sale_token");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sat_claves_productos_servicios"
    ADD CONSTRAINT "sat_claves_productos_servicios_pkey" PRIMARY KEY ("clave");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tax_regimes"
    ADD CONSTRAINT "tax_regimes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "unique_role_permission" UNIQUE ("role_id", "permission_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "unique_user_role" UNIQUE ("user_id", "role_id");



ALTER TABLE ONLY "public"."branch_inventory"
    ADD CONSTRAINT "uq_branch_inventory_branch_product" UNIQUE ("branch_id", "product_id");



ALTER TABLE ONLY "public"."cash_cut_details"
    ADD CONSTRAINT "uq_cash_cut_payment_method" UNIQUE ("cash_cut_id", "payment_method_id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "uq_system_settings_key_branch" UNIQUE ("setting_key", "branch_id");



ALTER TABLE ONLY "public"."user_branches"
    ADD CONSTRAINT "user_branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_branches"
    ADD CONSTRAINT "user_branches_user_branch_unique" UNIQUE ("user_id", "branch_id");



ALTER TABLE ONLY "public"."user_branches"
    ADD CONSTRAINT "user_branches_user_id_branch_id_key" UNIQUE ("user_id", "branch_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



CREATE UNIQUE INDEX "branches_code_unique" ON "public"."branches" USING "btree" ("lower"(("code")::"text"));



CREATE UNIQUE INDEX "branches_name_unique" ON "public"."branches" USING "btree" ("lower"(("name")::"text"));



CREATE INDEX "idx_cash_movements_session_id" ON "public"."cash_movements" USING "btree" ("session_id");



CREATE INDEX "idx_cash_sessions_branch_user" ON "public"."cash_register_sessions" USING "btree" ("branch_id", "user_id");



CREATE INDEX "idx_cash_sessions_opened_at" ON "public"."cash_register_sessions" USING "btree" ("opened_at");



CREATE INDEX "idx_customer_points_branch_id" ON "public"."customer_points" USING "btree" ("branch_id");



CREATE INDEX "idx_customer_points_created_at" ON "public"."customer_points" USING "btree" ("created_at");



CREATE INDEX "idx_customer_points_customer_id" ON "public"."customer_points" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_points_reward_id" ON "public"."customer_points" USING "btree" ("reward_id");



CREATE INDEX "idx_customer_points_user_id" ON "public"."customer_points" USING "btree" ("user_id");



CREATE INDEX "idx_customer_rewards_branch_id" ON "public"."customer_rewards" USING "btree" ("branch_id");



CREATE INDEX "idx_customer_rewards_redeemed_at" ON "public"."customer_rewards" USING "btree" ("redeemed_at");



CREATE INDEX "idx_customer_rewards_user_id" ON "public"."customer_rewards" USING "btree" ("user_id");



CREATE INDEX "idx_postal_codes_municipality" ON "public"."postal_codes" USING "btree" ("municipality");



CREATE INDEX "idx_postal_codes_postal_code" ON "public"."postal_codes" USING "btree" ("postal_code");



CREATE INDEX "idx_postal_codes_state" ON "public"."postal_codes" USING "btree" ("state");



CREATE INDEX "idx_product_kit_items_kit_id" ON "public"."product_kit_items" USING "btree" ("kit_id");



CREATE INDEX "idx_product_kits_kit_product_id" ON "public"."product_kits" USING "btree" ("kit_product_id");



CREATE INDEX "idx_reward_products_product_id" ON "public"."reward_products" USING "btree" ("product_id");



CREATE INDEX "idx_reward_products_reward_id" ON "public"."reward_products" USING "btree" ("reward_id");



CREATE INDEX "idx_sale_details_sale_id" ON "public"."sale_details" USING "btree" ("sale_id");



CREATE INDEX "idx_sale_kit_items_sale_detail_id" ON "public"."sale_kit_items" USING "btree" ("sale_detail_id");



CREATE INDEX "idx_sale_kit_items_sale_id" ON "public"."sale_kit_items" USING "btree" ("sale_id");



CREATE INDEX "idx_sale_payments_sale_id" ON "public"."sale_payments" USING "btree" ("sale_id");



CREATE INDEX "idx_sale_reward_redemptions_branch_id" ON "public"."sale_reward_redemptions" USING "btree" ("branch_id");



CREATE INDEX "idx_sale_reward_redemptions_created_at" ON "public"."sale_reward_redemptions" USING "btree" ("created_at");



CREATE INDEX "idx_sale_reward_redemptions_customer_id" ON "public"."sale_reward_redemptions" USING "btree" ("customer_id");



CREATE INDEX "idx_sale_reward_redemptions_product_id" ON "public"."sale_reward_redemptions" USING "btree" ("product_id");



CREATE INDEX "idx_sale_reward_redemptions_reward_id" ON "public"."sale_reward_redemptions" USING "btree" ("reward_id");



CREATE INDEX "idx_sale_reward_redemptions_sale_detail_id" ON "public"."sale_reward_redemptions" USING "btree" ("sale_detail_id");



CREATE INDEX "idx_sale_reward_redemptions_sale_id" ON "public"."sale_reward_redemptions" USING "btree" ("sale_id");



CREATE INDEX "idx_sale_reward_redemptions_status" ON "public"."sale_reward_redemptions" USING "btree" ("status");



CREATE INDEX "idx_sale_reward_redemptions_user_id" ON "public"."sale_reward_redemptions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "uq_postal_codes_unique_settlement" ON "public"."postal_codes" USING "btree" ("postal_code", "settlement", "municipality", "state");



CREATE UNIQUE INDEX "users_email_unique" ON "public"."users" USING "btree" ("lower"("email"));



CREATE UNIQUE INDEX "ux_cash_cuts_session_cut_type" ON "public"."cash_cuts" USING "btree" ("cash_register_session_id", "cut_type");



CREATE UNIQUE INDEX "ux_cash_register_sessions_one_open_per_branch" ON "public"."cash_register_sessions" USING "btree" ("branch_id") WHERE ((("status")::"text" = 'open'::"text") AND ("closed_at" IS NULL));



CREATE UNIQUE INDEX "ux_user_sessions_one_active_per_branch" ON "public"."user_sessions" USING "btree" ("branch_id") WHERE ((("status")::"text" = 'active'::"text") AND ("ended_at" IS NULL));



CREATE OR REPLACE TRIGGER "trg_branch_inventory_set_updated_at" BEFORE UPDATE ON "public"."branch_inventory" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_enforce_sale_branch_details" BEFORE INSERT OR UPDATE ON "public"."sale_details" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_sale_branch_consistency"();



CREATE OR REPLACE TRIGGER "trg_enforce_sale_branch_payments" BEFORE INSERT OR UPDATE ON "public"."sale_payments" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_sale_branch_consistency"();



CREATE OR REPLACE TRIGGER "trg_prevent_edit_sale_details" BEFORE INSERT OR DELETE OR UPDATE ON "public"."sale_details" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_edit_if_sale_not_open"();



CREATE OR REPLACE TRIGGER "trg_prevent_edit_sale_payments" BEFORE INSERT OR DELETE OR UPDATE ON "public"."sale_payments" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_edit_if_sale_not_open"();



CREATE OR REPLACE TRIGGER "trg_product_discounts_updated_at" BEFORE UPDATE ON "public"."product_discounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sales_set_updated_at" BEFORE UPDATE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_system_settings_set_updated_at" BEFORE UPDATE ON "public"."system_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."branch_inventory"
    ADD CONSTRAINT "branch_inventory_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."branch_inventory"
    ADD CONSTRAINT "branch_inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."canceled_sales"
    ADD CONSTRAINT "canceled_sales_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."canceled_sales"
    ADD CONSTRAINT "canceled_sales_refund_method_id_fkey" FOREIGN KEY ("refund_method_id") REFERENCES "public"."payment_methods"("id");



ALTER TABLE ONLY "public"."cash_cut_details"
    ADD CONSTRAINT "cash_cut_details_cash_cut_id_fkey" FOREIGN KEY ("cash_cut_id") REFERENCES "public"."cash_cuts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_cut_details"
    ADD CONSTRAINT "cash_cut_details_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id");



ALTER TABLE ONLY "public"."cash_cuts"
    ADD CONSTRAINT "cash_cuts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."cash_cuts"
    ADD CONSTRAINT "cash_cuts_cash_register_session_id_fkey" FOREIGN KEY ("cash_register_session_id") REFERENCES "public"."cash_register_sessions"("id");



ALTER TABLE ONLY "public"."cash_cuts"
    ADD CONSTRAINT "cash_cuts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."cash_movements"
    ADD CONSTRAINT "cash_movements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."cash_movements"
    ADD CONSTRAINT "cash_movements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."cash_register_sessions"("id");



ALTER TABLE ONLY "public"."cash_movements"
    ADD CONSTRAINT "cash_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."cash_register_sessions"
    ADD CONSTRAINT "cash_register_sessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."cash_register_sessions"
    ADD CONSTRAINT "cash_register_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."cfdi_settings"
    ADD CONSTRAINT "cfdi_settings_issuer_tax_regime_fkey" FOREIGN KEY ("issuer_tax_regime") REFERENCES "public"."tax_regimes"("id");



ALTER TABLE ONLY "public"."customer_points"
    ADD CONSTRAINT "customer_points_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."customer_points"
    ADD CONSTRAINT "customer_points_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id");



ALTER TABLE ONLY "public"."customer_points"
    ADD CONSTRAINT "customer_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."customer_rewards"
    ADD CONSTRAINT "customer_rewards_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."customer_rewards"
    ADD CONSTRAINT "customer_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_cfdi_use_fkey" FOREIGN KEY ("cfdi_use") REFERENCES "public"."cfdi_uses"("id");



ALTER TABLE ONLY "public"."canceled_sales"
    ADD CONSTRAINT "fk_canceled_sales_sale" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."canceled_sales"
    ADD CONSTRAINT "fk_canceled_sales_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."customer_points"
    ADD CONSTRAINT "fk_customer_points_customer" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."customer_points"
    ADD CONSTRAINT "fk_customer_points_sale" FOREIGN KEY ("related_sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."customer_rewards"
    ADD CONSTRAINT "fk_customer_rewards_customer" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."customer_rewards"
    ADD CONSTRAINT "fk_customer_rewards_reward" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "fk_customers_tax_regime" FOREIGN KEY ("tax_regime") REFERENCES "public"."tax_regimes"("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "fk_inventory_movements_branch" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "fk_inventory_movements_product" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "fk_inventory_movements_related_branch" FOREIGN KEY ("related_branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "fk_inventory_movements_sale" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "fk_inventory_movements_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "fk_invoice_cfdi_use" FOREIGN KEY ("cfdi_use") REFERENCES "public"."cfdi_uses"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "fk_invoice_customer" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "fk_invoice_item_branch" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "fk_invoice_item_invoice" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "fk_invoice_item_product" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "fk_invoice_payment_form" FOREIGN KEY ("payment_form") REFERENCES "public"."payment_forms_sat"("code");



ALTER TABLE ONLY "public"."invoice_payments"
    ADD CONSTRAINT "fk_invoice_payment_invoice" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id");



ALTER TABLE ONLY "public"."invoice_payments"
    ADD CONSTRAINT "fk_invoice_payment_method" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "fk_invoice_sale" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."inventory_transfer_items"
    ADD CONSTRAINT "inventory_transfer_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."inventory_transfer_items"
    ADD CONSTRAINT "inventory_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "public"."inventory_transfers"("id");



ALTER TABLE ONLY "public"."inventory_transfers"
    ADD CONSTRAINT "inventory_transfers_from_branch_id_fkey" FOREIGN KEY ("from_branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."inventory_transfers"
    ADD CONSTRAINT "inventory_transfers_to_branch_id_fkey" FOREIGN KEY ("to_branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."inventory_transfers"
    ADD CONSTRAINT "inventory_transfers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."pos_devices"
    ADD CONSTRAINT "pos_devices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."price_changes"
    ADD CONSTRAINT "price_changes_affected_branch_id_fkey" FOREIGN KEY ("affected_branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."price_changes"
    ADD CONSTRAINT "price_changes_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."price_changes"
    ADD CONSTRAINT "price_changes_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."price_changes"
    ADD CONSTRAINT "price_changes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."product_discounts"
    ADD CONSTRAINT "product_discounts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_kit_items"
    ADD CONSTRAINT "product_kit_items_component_product_id_fkey" FOREIGN KEY ("component_product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."product_kit_items"
    ADD CONSTRAINT "product_kit_items_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "public"."product_kits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_kits"
    ADD CONSTRAINT "product_kits_kit_product_id_fkey" FOREIGN KEY ("kit_product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_clave_sat_fkey" FOREIGN KEY ("clave_sat") REFERENCES "public"."sat_claves_productos_servicios"("clave");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."reward_products"
    ADD CONSTRAINT "reward_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reward_products"
    ADD CONSTRAINT "reward_products_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."sale_details"
    ADD CONSTRAINT "sale_details_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."sale_details"
    ADD CONSTRAINT "sale_details_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."sale_details"
    ADD CONSTRAINT "sale_details_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_kit_items"
    ADD CONSTRAINT "sale_kit_items_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."sale_kit_items"
    ADD CONSTRAINT "sale_kit_items_component_product_id_fkey" FOREIGN KEY ("component_product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."sale_kit_items"
    ADD CONSTRAINT "sale_kit_items_kit_product_id_fkey" FOREIGN KEY ("kit_product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."sale_kit_items"
    ADD CONSTRAINT "sale_kit_items_sale_detail_id_fkey" FOREIGN KEY ("sale_detail_id") REFERENCES "public"."sale_details"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_kit_items"
    ADD CONSTRAINT "sale_kit_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_payments"
    ADD CONSTRAINT "sale_payments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."sale_payments"
    ADD CONSTRAINT "sale_payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id");



ALTER TABLE ONLY "public"."sale_payments"
    ADD CONSTRAINT "sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_return_items"
    ADD CONSTRAINT "sale_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."sale_returns"("id");



ALTER TABLE ONLY "public"."sale_return_items"
    ADD CONSTRAINT "sale_return_items_sale_detail_id_fkey" FOREIGN KEY ("sale_detail_id") REFERENCES "public"."sale_details"("id");



ALTER TABLE ONLY "public"."sale_returns"
    ADD CONSTRAINT "sale_returns_refund_method_id_fkey" FOREIGN KEY ("refund_method_id") REFERENCES "public"."payment_methods"("id");



ALTER TABLE ONLY "public"."sale_returns"
    ADD CONSTRAINT "sale_returns_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."sale_reward_redemptions"
    ADD CONSTRAINT "sale_reward_redemptions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sale_reward_redemptions"
    ADD CONSTRAINT "sale_reward_redemptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sale_reward_redemptions"
    ADD CONSTRAINT "sale_reward_redemptions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sale_reward_redemptions"
    ADD CONSTRAINT "sale_reward_redemptions_reversed_by_fkey" FOREIGN KEY ("reversed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sale_reward_redemptions"
    ADD CONSTRAINT "sale_reward_redemptions_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sale_reward_redemptions"
    ADD CONSTRAINT "sale_reward_redemptions_sale_detail_id_fkey" FOREIGN KEY ("sale_detail_id") REFERENCES "public"."sale_details"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sale_reward_redemptions"
    ADD CONSTRAINT "sale_reward_redemptions_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_reward_redemptions"
    ADD CONSTRAINT "sale_reward_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."user_branches"
    ADD CONSTRAINT "user_branches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_branches"
    ADD CONSTRAINT "user_branches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



CREATE POLICY "Allow read postal codes" ON "public"."postal_codes" FOR SELECT TO "authenticated", "anon" USING (("status" = true));



CREATE POLICY "Allow read tax regimes" ON "public"."tax_regimes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can insert sale reward redemptions" ON "public"."sale_reward_redemptions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can read sale reward redemptions" ON "public"."sale_reward_redemptions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update sale reward redemptions" ON "public"."sale_reward_redemptions" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."branch_inventory" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "branch_inventory_delete" ON "public"."branch_inventory" FOR DELETE USING ("public"."has_permission"('can_manage_inventory'::"text"));



CREATE POLICY "branch_inventory_insert" ON "public"."branch_inventory" FOR INSERT WITH CHECK ("public"."has_permission"('can_manage_inventory'::"text"));



CREATE POLICY "branch_inventory_select" ON "public"."branch_inventory" FOR SELECT USING ("public"."has_permission"('can_view_branch'::"text"));



CREATE POLICY "branch_inventory_update" ON "public"."branch_inventory" FOR UPDATE USING ("public"."has_permission"('can_manage_inventory'::"text")) WITH CHECK ("public"."has_permission"('can_manage_inventory'::"text"));



CREATE POLICY "branches_select_authenticated_all" ON "public"."branches" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."cash_movements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cash_movements_insert_policy" ON "public"."cash_movements" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."cash_register_sessions" "crs"
  WHERE (("crs"."id" = "cash_movements"."session_id") AND ("crs"."user_id" = "auth"."uid"()) AND ("crs"."branch_id" = "cash_movements"."branch_id") AND (("crs"."status")::"text" = 'open'::"text"))))));



CREATE POLICY "cash_movements_select_policy" ON "public"."cash_movements" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."cash_register_sessions" "crs"
  WHERE (("crs"."id" = "cash_movements"."session_id") AND ("crs"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."cash_register_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cfdi_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."postal_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read own cash sessions" ON "public"."cash_register_sessions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."reward_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reward_products_delete_authenticated" ON "public"."reward_products" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "reward_products_insert_authenticated" ON "public"."reward_products" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "reward_products_select_authenticated" ON "public"."reward_products" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "reward_products_update_authenticated" ON "public"."reward_products" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."sale_details" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sale_details_delete_policy" ON "public"."sale_details" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "sale_details_insert_policy" ON "public"."sale_details" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "sale_details_select_policy" ON "public"."sale_details" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "sale_details_update_policy" ON "public"."sale_details" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."sale_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sale_payments_delete_policy" ON "public"."sale_payments" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "sale_payments_insert_policy" ON "public"."sale_payments" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "sale_payments_select_policy" ON "public"."sale_payments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "sale_payments_update_policy" ON "public"."sale_payments" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."sale_reward_redemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_insert_policy" ON "public"."sales" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "sales_select_policy" ON "public"."sales" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "sales_update_policy" ON "public"."sales" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."tax_regimes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_branches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_branches_admin_write" ON "public"."user_branches" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "user_branches_select_own" ON "public"."user_branches" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users_select_policy" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."_apply_inventory_delta"("p_branch_id" "uuid", "p_product_id" "uuid", "p_delta" numeric, "p_cost_price" numeric, "p_sale_price" numeric, "p_reason" "text", "p_user_id" "uuid", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."_apply_inventory_delta"("p_branch_id" "uuid", "p_product_id" "uuid", "p_delta" numeric, "p_cost_price" numeric, "p_sale_price" numeric, "p_reason" "text", "p_user_id" "uuid", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_apply_inventory_delta"("p_branch_id" "uuid", "p_product_id" "uuid", "p_delta" numeric, "p_cost_price" numeric, "p_sale_price" numeric, "p_reason" "text", "p_user_id" "uuid", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."_build_transfer_notes"("p_note_text" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."_build_transfer_notes"("p_note_text" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_build_transfer_notes"("p_note_text" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."cash_register_sessions" TO "anon";
GRANT ALL ON TABLE "public"."cash_register_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_register_sessions" TO "service_role";



REVOKE ALL ON FUNCTION "public"."_cash_already_open_response"("p_session" "public"."cash_register_sessions", "p_current_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_cash_already_open_response"("p_session" "public"."cash_register_sessions", "p_current_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."_cash_already_open_response"("p_session" "public"."cash_register_sessions", "p_current_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_cash_already_open_response"("p_session" "public"."cash_register_sessions", "p_current_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_cash_max_opening_amount"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_cash_max_opening_amount"() TO "anon";
GRANT ALL ON FUNCTION "public"."_cash_max_opening_amount"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_cash_max_opening_amount"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."_cash_session_payload"("p_session" "public"."cash_register_sessions") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_cash_session_payload"("p_session" "public"."cash_register_sessions") TO "anon";
GRANT ALL ON FUNCTION "public"."_cash_session_payload"("p_session" "public"."cash_register_sessions") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_cash_session_payload"("p_session" "public"."cash_register_sessions") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_sale"("p_sale_id" "uuid", "p_reason" "text", "p_refund_method_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_sale"("p_sale_id" "uuid", "p_reason" "text", "p_refund_method_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_sale"("p_sale_id" "uuid", "p_reason" "text", "p_refund_method_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_sale_transaction"("p_sale_id" "uuid", "p_user_id" "uuid", "p_branch_id" "uuid", "p_cancel_reason" "text", "p_refund_method_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_sale_transaction"("p_sale_id" "uuid", "p_user_id" "uuid", "p_branch_id" "uuid", "p_cancel_reason" "text", "p_refund_method_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_sale_transaction"("p_sale_id" "uuid", "p_user_id" "uuid", "p_branch_id" "uuid", "p_cancel_reason" "text", "p_refund_method_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_transfer_order"("p_transfer_id" "uuid", "p_current_branch" "uuid", "p_user_id" "uuid", "p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_transfer_order"("p_transfer_id" "uuid", "p_current_branch" "uuid", "p_user_id" "uuid", "p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_transfer_order"("p_transfer_id" "uuid", "p_current_branch" "uuid", "p_user_id" "uuid", "p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."close_cash_register_session"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."close_cash_register_session"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_cash_register_session"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_sale"("p_sale_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_sale"("p_sale_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_sale"("p_sale_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_partial_return_transaction"("p_sale_id" "uuid", "p_user_id" "uuid", "p_branch_id" "uuid", "p_return_reason" "text", "p_refund_method_id" "uuid", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_partial_return_transaction"("p_sale_id" "uuid", "p_user_id" "uuid", "p_branch_id" "uuid", "p_return_reason" "text", "p_refund_method_id" "uuid", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_partial_return_transaction"("p_sale_id" "uuid", "p_user_id" "uuid", "p_branch_id" "uuid", "p_return_reason" "text", "p_refund_method_id" "uuid", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_sale_transaction"("p_branch_id" "uuid", "p_user_id" "uuid", "p_customer_id" "uuid", "p_subtotal" numeric, "p_tax" numeric, "p_total" numeric, "p_sale_date" timestamp with time zone, "p_products" "jsonb", "p_payments" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_sale_transaction"("p_branch_id" "uuid", "p_user_id" "uuid", "p_customer_id" "uuid", "p_subtotal" numeric, "p_tax" numeric, "p_total" numeric, "p_sale_date" timestamp with time zone, "p_products" "jsonb", "p_payments" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_sale_transaction"("p_branch_id" "uuid", "p_user_id" "uuid", "p_customer_id" "uuid", "p_subtotal" numeric, "p_tax" numeric, "p_total" numeric, "p_sale_date" timestamp with time zone, "p_products" "jsonb", "p_payments" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_sale_transaction"("p_branch_id" "uuid", "p_user_id" "uuid", "p_customer_id" "uuid", "p_subtotal" numeric, "p_tax" numeric, "p_total" numeric, "p_sale_date" timestamp with time zone, "p_products" "jsonb", "p_payments" "jsonb", "p_client_sale_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_sale_transaction"("p_branch_id" "uuid", "p_user_id" "uuid", "p_customer_id" "uuid", "p_subtotal" numeric, "p_tax" numeric, "p_total" numeric, "p_sale_date" timestamp with time zone, "p_products" "jsonb", "p_payments" "jsonb", "p_client_sale_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_sale_transaction"("p_branch_id" "uuid", "p_user_id" "uuid", "p_customer_id" "uuid", "p_subtotal" numeric, "p_tax" numeric, "p_total" numeric, "p_sale_date" timestamp with time zone, "p_products" "jsonb", "p_payments" "jsonb", "p_client_sale_token" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_sale_transaction"("p_branch_id" "uuid", "p_user_id" "uuid", "p_customer_id" "uuid", "p_subtotal" numeric, "p_tax" numeric, "p_total" numeric, "p_sale_date" timestamp with time zone, "p_products" "jsonb", "p_payments" "jsonb", "p_client_sale_token" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_sale_transaction"("p_branch_id" "uuid", "p_user_id" "uuid", "p_customer_id" "uuid", "p_subtotal" numeric, "p_tax" numeric, "p_total" numeric, "p_sale_date" timestamp with time zone, "p_products" "jsonb", "p_payments" "jsonb", "p_client_sale_token" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_sale_transaction"("p_branch_id" "uuid", "p_user_id" "uuid", "p_customer_id" "uuid", "p_subtotal" numeric, "p_tax" numeric, "p_total" numeric, "p_sale_date" timestamp with time zone, "p_products" "jsonb", "p_payments" "jsonb", "p_client_sale_token" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_transfer_order"("p_from_branch_id" "uuid", "p_to_branch_id" "uuid", "p_user_id" "uuid", "p_notes" "text", "p_folio" "text", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_transfer_order"("p_from_branch_id" "uuid", "p_to_branch_id" "uuid", "p_user_id" "uuid", "p_notes" "text", "p_folio" "text", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_transfer_order"("p_from_branch_id" "uuid", "p_to_branch_id" "uuid", "p_user_id" "uuid", "p_notes" "text", "p_folio" "text", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_sale_branch_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_sale_branch_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_sale_branch_consistency"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_branch_by_device"("p_device_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_branch_by_device"("p_device_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_branch_by_device"("p_device_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_branch_by_device"("p_device_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_branch_products_paginated"("p_branch_id" "uuid", "p_search" "text", "p_department_id" "uuid", "p_page" integer, "p_page_size" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_branch_products_paginated"("p_branch_id" "uuid", "p_search" "text", "p_department_id" "uuid", "p_page" integer, "p_page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_branch_products_paginated"("p_branch_id" "uuid", "p_search" "text", "p_department_id" "uuid", "p_page" integer, "p_page_size" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_cash_register_session"("p_branch_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_cash_register_session"("p_branch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cash_register_session"("p_branch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cash_register_session"("p_branch_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_cash_report_sessions"("p_branch_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_cashier_id" "uuid", "p_session_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_cash_report_sessions"("p_branch_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_cashier_id" "uuid", "p_session_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cash_report_sessions"("p_branch_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_cashier_id" "uuid", "p_session_status" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_commissions_report_data"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_branch_id" "uuid", "p_cashier_id" "uuid", "p_department_id" "uuid", "p_page" integer, "p_page_size" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_commissions_report_data"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_branch_id" "uuid", "p_cashier_id" "uuid", "p_department_id" "uuid", "p_page" integer, "p_page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_commissions_report_data"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone, "p_branch_id" "uuid", "p_cashier_id" "uuid", "p_department_id" "uuid", "p_page" integer, "p_page_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_inventory_report_data"("p_branch_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_inventory_report_data"("p_branch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_inventory_report_data"("p_branch_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sales_report_kpis"("p_start" timestamp with time zone, "p_end" timestamp with time zone, "p_branch" "uuid", "p_cashier" "uuid", "p_status" "text", "p_payment" "text", "p_discount" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_sales_report_kpis"("p_start" timestamp with time zone, "p_end" timestamp with time zone, "p_branch" "uuid", "p_cashier" "uuid", "p_status" "text", "p_payment" "text", "p_discount" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sales_report_kpis"("p_start" timestamp with time zone, "p_end" timestamp with time zone, "p_branch" "uuid", "p_cashier" "uuid", "p_status" "text", "p_payment" "text", "p_discount" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."open_cash_register"("p_branch_id" "uuid", "p_opening_amount" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."open_cash_register"("p_branch_id" "uuid", "p_opening_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."open_cash_register"("p_branch_id" "uuid", "p_opening_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."open_cash_register"("p_branch_id" "uuid", "p_opening_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_edit_if_sale_not_open"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_edit_if_sale_not_open"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_edit_if_sale_not_open"() TO "service_role";



GRANT ALL ON FUNCTION "public"."receive_transfer_order"("p_transfer_id" "uuid", "p_destination_branch" "uuid", "p_user_id" "uuid", "p_username" "text", "p_received_qty_map" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."receive_transfer_order"("p_transfer_id" "uuid", "p_destination_branch" "uuid", "p_user_id" "uuid", "p_username" "text", "p_received_qty_map" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."receive_transfer_order"("p_transfer_id" "uuid", "p_destination_branch" "uuid", "p_user_id" "uuid", "p_username" "text", "p_received_qty_map" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."branch_inventory" TO "anon";
GRANT ALL ON TABLE "public"."branch_inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."branch_inventory" TO "service_role";



GRANT ALL ON TABLE "public"."branches" TO "anon";
GRANT ALL ON TABLE "public"."branches" TO "authenticated";
GRANT ALL ON TABLE "public"."branches" TO "service_role";



GRANT ALL ON TABLE "public"."canceled_sales" TO "anon";
GRANT ALL ON TABLE "public"."canceled_sales" TO "authenticated";
GRANT ALL ON TABLE "public"."canceled_sales" TO "service_role";



GRANT ALL ON TABLE "public"."cash_cut_details" TO "anon";
GRANT ALL ON TABLE "public"."cash_cut_details" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_cut_details" TO "service_role";



GRANT ALL ON TABLE "public"."cash_cuts" TO "anon";
GRANT ALL ON TABLE "public"."cash_cuts" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_cuts" TO "service_role";



GRANT ALL ON TABLE "public"."cash_movements" TO "anon";
GRANT ALL ON TABLE "public"."cash_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_movements" TO "service_role";



GRANT ALL ON TABLE "public"."cfdi_settings" TO "anon";
GRANT ALL ON TABLE "public"."cfdi_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."cfdi_settings" TO "service_role";



GRANT ALL ON TABLE "public"."cfdi_uses" TO "anon";
GRANT ALL ON TABLE "public"."cfdi_uses" TO "authenticated";
GRANT ALL ON TABLE "public"."cfdi_uses" TO "service_role";



GRANT ALL ON TABLE "public"."customer_points" TO "anon";
GRANT ALL ON TABLE "public"."customer_points" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_points" TO "service_role";



GRANT ALL ON TABLE "public"."customer_rewards" TO "anon";
GRANT ALL ON TABLE "public"."customer_rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_adjustments" TO "anon";
GRANT ALL ON TABLE "public"."inventory_adjustments" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_adjustments" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_movements" TO "anon";
GRANT ALL ON TABLE "public"."inventory_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_movements" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_transfer_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_transfer_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_transfer_items" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_transfers" TO "anon";
GRANT ALL ON TABLE "public"."inventory_transfers" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_transfers" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_payments" TO "anon";
GRANT ALL ON TABLE "public"."invoice_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_payments" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."payment_forms_sat" TO "anon";
GRANT ALL ON TABLE "public"."payment_forms_sat" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_forms_sat" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."pos_devices" TO "anon";
GRANT ALL ON TABLE "public"."pos_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_devices" TO "service_role";



GRANT ALL ON TABLE "public"."postal_codes" TO "anon";
GRANT ALL ON TABLE "public"."postal_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."postal_codes" TO "service_role";



GRANT ALL ON TABLE "public"."price_changes" TO "anon";
GRANT ALL ON TABLE "public"."price_changes" TO "authenticated";
GRANT ALL ON TABLE "public"."price_changes" TO "service_role";



GRANT ALL ON TABLE "public"."product_discounts" TO "anon";
GRANT ALL ON TABLE "public"."product_discounts" TO "authenticated";
GRANT ALL ON TABLE "public"."product_discounts" TO "service_role";



GRANT ALL ON TABLE "public"."product_kit_items" TO "anon";
GRANT ALL ON TABLE "public"."product_kit_items" TO "authenticated";
GRANT ALL ON TABLE "public"."product_kit_items" TO "service_role";



GRANT ALL ON TABLE "public"."product_kits" TO "anon";
GRANT ALL ON TABLE "public"."product_kits" TO "authenticated";
GRANT ALL ON TABLE "public"."product_kits" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."reward_products" TO "anon";
GRANT ALL ON TABLE "public"."reward_products" TO "authenticated";
GRANT ALL ON TABLE "public"."reward_products" TO "service_role";



GRANT ALL ON TABLE "public"."rewards" TO "anon";
GRANT ALL ON TABLE "public"."rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."rewards" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."sale_details" TO "anon";
GRANT ALL ON TABLE "public"."sale_details" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_details" TO "service_role";



GRANT ALL ON TABLE "public"."sale_kit_items" TO "anon";
GRANT ALL ON TABLE "public"."sale_kit_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_kit_items" TO "service_role";



GRANT ALL ON TABLE "public"."sale_payments" TO "anon";
GRANT ALL ON TABLE "public"."sale_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_payments" TO "service_role";



GRANT ALL ON TABLE "public"."sale_return_items" TO "anon";
GRANT ALL ON TABLE "public"."sale_return_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_return_items" TO "service_role";



GRANT ALL ON TABLE "public"."sale_returns" TO "anon";
GRANT ALL ON TABLE "public"."sale_returns" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_returns" TO "service_role";



GRANT ALL ON TABLE "public"."sale_reward_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."sale_reward_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_reward_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."sat_claves_productos_servicios" TO "anon";
GRANT ALL ON TABLE "public"."sat_claves_productos_servicios" TO "authenticated";
GRANT ALL ON TABLE "public"."sat_claves_productos_servicios" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."tax_regimes" TO "anon";
GRANT ALL ON TABLE "public"."tax_regimes" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_regimes" TO "service_role";



GRANT ALL ON TABLE "public"."user_branches" TO "anon";
GRANT ALL ON TABLE "public"."user_branches" TO "authenticated";
GRANT ALL ON TABLE "public"."user_branches" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."v_sales_report_list" TO "anon";
GRANT ALL ON TABLE "public"."v_sales_report_list" TO "authenticated";
GRANT ALL ON TABLE "public"."v_sales_report_list" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








