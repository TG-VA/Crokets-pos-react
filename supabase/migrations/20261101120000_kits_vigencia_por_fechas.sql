-- Vigencia por fechas para kits de productos.
--
-- Agrega las columnas starts_on / ends_on (fechas calendario, ambas inclusivas y opcionales) a
-- product_kits. NULL significa sin limite, por lo que los kits existentes conservan su
-- comportamiento actual. No se usa cron: la vigencia se evalua al momento de vender con
-- kit_is_available(), usando la zona horaria de la sucursal (branches.timezone).
--
-- Rollback (manual, solo si se necesita revertir):
--   1. Restaurar create_kit_transaction / update_kit_transaction desde 20260923150000_create_product_kits_rpcs.sql.
--   2. Restaurar create_sale_transaction (11 parametros) desde 20261002124615_add_cost_tracking_and_sale_cost_snapshot.sql.
--   3. DROP FUNCTION public.kit_is_available(boolean, date, date, text);
--   4. ALTER TABLE public.product_kits DROP CONSTRAINT product_kits_validity_range_chk,
--        DROP COLUMN starts_on, DROP COLUMN ends_on;

ALTER TABLE public.product_kits
  ADD COLUMN IF NOT EXISTS starts_on date,
  ADD COLUMN IF NOT EXISTS ends_on date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_kits_validity_range_chk'
  ) THEN
    ALTER TABLE public.product_kits
      ADD CONSTRAINT product_kits_validity_range_chk
      CHECK (starts_on IS NULL OR ends_on IS NULL OR ends_on >= starts_on);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.kit_is_available(p_is_active boolean, p_starts_on date, p_ends_on date, p_timezone text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(p_is_active, false)
     and (p_starts_on is null or (now() at time zone coalesce(p_timezone, 'America/Cancun'))::date >= p_starts_on)
     and (p_ends_on is null or (now() at time zone coalesce(p_timezone, 'America/Cancun'))::date <= p_ends_on);
$function$;

REVOKE ALL ON FUNCTION public.kit_is_available(boolean, date, date, text) FROM public;
REVOKE ALL ON FUNCTION public.kit_is_available(boolean, date, date, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.kit_is_available(boolean, date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kit_is_available(boolean, date, date, text) TO service_role;

CREATE OR REPLACE FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  v_cost_price numeric;
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
  v_kit_starts_on date;
  v_kit_ends_on date;
  v_branch_timezone text;
  v_component record;
  v_component_required_qty numeric;
  v_component_inventory record;
  v_sale_detail_id uuid;

  v_commission_enabled boolean;
  v_commission_type varchar;
  v_commission_value numeric;
  v_commission_percent numeric;
  v_dept_commission_enabled boolean;
  v_dept_commission_type varchar;
  v_dept_commission_value numeric;

  v_comm_enabled boolean := false;
  v_comm_type varchar;
  v_comm_value numeric;
  v_comm_amount numeric := 0;
begin
  select coalesce(b.timezone, 'America/Cancun')
  into v_branch_timezone
  from public.branches b
  where b.id = p_branch_id;

  v_branch_timezone := coalesce(v_branch_timezone, 'America/Cancun');

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
      select id, is_active, starts_on, ends_on
      into v_kit_id, v_kit_is_active, v_kit_starts_on, v_kit_ends_on
      from public.product_kits
      where kit_product_id = v_product_id;

      if not found then
        raise exception 'El kit % no tiene configuración registrada.', v_product_id;
      end if;

      if v_kit_is_active is false then
        raise exception 'El kit % está inactivo.', v_product_id;
      end if;

      if not public.kit_is_available(v_kit_is_active, v_kit_starts_on, v_kit_ends_on, v_branch_timezone) then
        raise exception 'El kit % está fuera de su vigencia.', v_product_id;
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

    -- Snapshot de comision: se resuelve con el catalogo vigente EN ESTE INSTANTE
    -- (la transaccion es una sola snapshot de base de datos) y se congela en la
    -- partida para que el reporte historico nunca la recalcule.
    select
      p.commission_enabled,
      p.commission_type,
      p.commission_value,
      p.commission_percent,
      d.commission_enabled,
      d.commission_type,
      d.commission_value
    into
      v_commission_enabled,
      v_commission_type,
      v_commission_value,
      v_commission_percent,
      v_dept_commission_enabled,
      v_dept_commission_type,
      v_dept_commission_value
    from public.products p
    left join public.departments d on d.id = p.department_id
    where p.id = v_product_id;

    if v_commission_enabled is true then
      v_comm_enabled := true;
      v_comm_type := coalesce(v_commission_type, 'percent');
      if lower(coalesce(v_commission_type, 'percent')) = 'percent' then
        v_comm_value := coalesce(v_commission_percent, v_commission_value, 0);
        v_comm_amount := round(v_unit_price * v_quantity * (v_comm_value / 100.0), 2);
      else
        v_comm_value := coalesce(v_commission_value, 0);
        v_comm_amount := round(v_comm_value * v_quantity, 2);
      end if;
    elsif v_commission_enabled is null and coalesce(v_dept_commission_enabled, false) is true then
      v_comm_enabled := true;
      v_comm_type := coalesce(v_dept_commission_type, 'percent');
      if lower(coalesce(v_dept_commission_type, 'percent')) = 'percent' then
        v_comm_value := coalesce(v_dept_commission_value, 0);
        v_comm_amount := round(v_unit_price * v_quantity * (v_comm_value / 100.0), 2);
      else
        v_comm_value := coalesce(v_dept_commission_value, 0);
        v_comm_amount := round(v_comm_value * v_quantity, 2);
      end if;
    else
      v_comm_enabled := false;
      v_comm_type := null;
      v_comm_value := null;
      v_comm_amount := 0;
    end if;

    -- Snapshot de costo: costo unitario vigente en la sucursal en ESTE
    -- INSTANTE (la transaccion es una sola snapshot de base de datos). Si el
    -- producto no tiene fila en la sucursal o su costo es nulo, cae al costo
    -- del catalogo. Se congela en la partida para que la utilidad historica de
    -- la venta no se recalcule cuando cambie el costo.
    select coalesce(bi.cost_price, p.cost_price)
    into v_cost_price
    from public.products p
    left join public.branch_inventory bi
      on bi.product_id = p.id
     and bi.branch_id = p_branch_id
    where p.id = v_product_id;

    v_cost_price := round(coalesce(v_cost_price, 0), 2);

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
      discount_amount,
      commission_enabled,
      commission_type,
      commission_value,
      commission_amount,
      cost_price
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
      v_discount_amount,
      v_comm_enabled,
      v_comm_type,
      v_comm_value,
      v_comm_amount,
      v_cost_price
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

CREATE OR REPLACE FUNCTION public.create_kit_transaction(p_kit_product jsonb, p_kit_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_now                  timestamptz := now();
    v_barcode              text;
    v_name                 text;
    v_sale_price           numeric;
    v_max_kits             integer;
    v_starts_on            date;
    v_ends_on              date;
    v_kit_product_id       uuid;
    v_kit_id               uuid;
    v_item                 record;
    v_idx                  integer := 0;
    v_component_product_id uuid;
    v_quantity             numeric;
begin
    v_barcode    := btrim(coalesce(p_kit_product ->> 'barcode', ''));
    v_name       := btrim(coalesce(p_kit_product ->> 'name', p_kit_product ->> 'description', ''));
    v_sale_price := coalesce((p_kit_product ->> 'sale_price')::numeric, (p_kit_product ->> 'price')::numeric, 0);
    v_max_kits   := coalesce((p_kit_product ->> 'max_kits_per_sale')::integer, 1);

    begin
        v_starts_on := nullif(btrim(coalesce(p_kit_product ->> 'starts_on', '')), '')::date;
        v_ends_on   := nullif(btrim(coalesce(p_kit_product ->> 'ends_on', '')), '')::date;
    exception when invalid_datetime_format or datetime_field_overflow then
        raise exception 'Las fechas de vigencia del kit no son válidas.';
    end;
    if v_starts_on is not null and v_ends_on is not null and v_ends_on < v_starts_on then
        raise exception 'La fecha de fin de vigencia no puede ser anterior a la fecha de inicio.';
    end if;

    if v_barcode = '' then
        raise exception 'El código de barras del kit es obligatorio.';
    end if;
    if v_name = '' then
        raise exception 'La descripción del kit es obligatoria.';
    end if;
    if v_sale_price <= 0 then
        raise exception 'El precio del kit debe ser mayor a 0.';
    end if;
    if v_max_kits < 1 then
        raise exception 'El límite de venta del kit debe ser mayor o igual a 1.';
    end if;
    if p_kit_items is null or jsonb_array_length(p_kit_items) = 0 then
        raise exception 'Agrega al menos un producto al kit.';
    end if;

    insert into public.products (
        barcode, name, sale_type, department_id, unit, cost_price, sale_price,
        tax, commission_enabled, commission_percent, clave_sat, status, is_global,
        is_kit, tracks_inventory, created_at, updated_at, max_kits_per_sale
    ) values (
        v_barcode, v_name, 'unidad', null, 'pieza', 0, v_sale_price,
        16, false, 0, null, true, true,
        true, false, v_now, v_now, v_max_kits
    )
    returning id into v_kit_product_id;

    insert into public.product_kits (kit_product_id, is_active, starts_on, ends_on, created_at, updated_at)
    values (v_kit_product_id, true, v_starts_on, v_ends_on, v_now, v_now)
    returning id into v_kit_id;

    for v_item in select * from jsonb_array_elements(p_kit_items) loop
        v_idx := v_idx + 1;
        v_component_product_id := coalesce(
            (v_item.value ->> 'component_product_id')::uuid,
            (v_item.value ->> 'product_id')::uuid,
            (v_item.value ->> 'id')::uuid
        );
        v_quantity := coalesce((v_item.value ->> 'quantity')::numeric, 0);

        if v_component_product_id is null then
            raise exception 'Producto inválido en la línea % del kit.', v_idx;
        end if;
        if v_quantity <= 0 then
            raise exception 'Cantidad inválida en la línea % del kit.', v_idx;
        end if;

        insert into public.product_kit_items (kit_id, component_product_id, quantity, created_at)
        values (v_kit_id, v_component_product_id, v_quantity, v_now);
    end loop;

    return v_kit_id;

exception when others then
    raise exception 'create_kit_transaction: % (SQLSTATE=%)', sqlerrm, sqlstate;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_kit_transaction(p_kit_id uuid, p_kit_product_id uuid, p_kit_product jsonb, p_kit_items jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_now                  timestamptz := now();
    v_barcode              text;
    v_name                 text;
    v_sale_price           numeric;
    v_max_kits             integer;
    v_starts_on            date;
    v_ends_on              date;
    v_has_validity         boolean;
    v_item                 record;
    v_idx                  integer := 0;
    v_component_product_id uuid;
    v_quantity             numeric;
begin
    if p_kit_id is null then
        raise exception 'El identificador del kit es requerido.';
    end if;
    if p_kit_product_id is null then
        raise exception 'El producto del kit es requerido.';
    end if;

    v_barcode    := btrim(coalesce(p_kit_product ->> 'barcode', ''));
    v_name       := btrim(coalesce(p_kit_product ->> 'name', p_kit_product ->> 'description', ''));
    v_sale_price := coalesce((p_kit_product ->> 'sale_price')::numeric, (p_kit_product ->> 'price')::numeric, 0);
    v_max_kits   := coalesce((p_kit_product ->> 'max_kits_per_sale')::integer, 1);

    begin
        v_starts_on := nullif(btrim(coalesce(p_kit_product ->> 'starts_on', '')), '')::date;
        v_ends_on   := nullif(btrim(coalesce(p_kit_product ->> 'ends_on', '')), '')::date;
    exception when invalid_datetime_format or datetime_field_overflow then
        raise exception 'Las fechas de vigencia del kit no son válidas.';
    end;
    if v_starts_on is not null and v_ends_on is not null and v_ends_on < v_starts_on then
        raise exception 'La fecha de fin de vigencia no puede ser anterior a la fecha de inicio.';
    end if;
    v_has_validity := (p_kit_product ? 'starts_on') or (p_kit_product ? 'ends_on');

    if v_barcode = '' then
        raise exception 'El código de barras del kit es obligatorio.';
    end if;
    if v_name = '' then
        raise exception 'La descripción del kit es obligatoria.';
    end if;
    if v_sale_price <= 0 then
        raise exception 'El precio del kit debe ser mayor a 0.';
    end if;
    if v_max_kits < 1 then
        raise exception 'El límite de venta del kit debe ser mayor o igual a 1.';
    end if;
    if p_kit_items is null or jsonb_array_length(p_kit_items) = 0 then
        raise exception 'Agrega al menos un producto al kit.';
    end if;

    update public.products
       set barcode = v_barcode,
           name = v_name,
           sale_price = v_sale_price,
           max_kits_per_sale = v_max_kits,
           updated_at = v_now
     where id = p_kit_product_id;

    update public.product_kits
       set starts_on = case when v_has_validity then v_starts_on else starts_on end,
           ends_on = case when v_has_validity then v_ends_on else ends_on end,
           updated_at = v_now
     where id = p_kit_id;

    delete from public.product_kit_items
     where kit_id = p_kit_id;

    for v_item in select * from jsonb_array_elements(p_kit_items) loop
        v_idx := v_idx + 1;
        v_component_product_id := coalesce(
            (v_item.value ->> 'component_product_id')::uuid,
            (v_item.value ->> 'product_id')::uuid,
            (v_item.value ->> 'id')::uuid
        );
        v_quantity := coalesce((v_item.value ->> 'quantity')::numeric, 0);

        if v_component_product_id is null then
            raise exception 'Producto inválido en la línea % del kit.', v_idx;
        end if;
        if v_quantity <= 0 then
            raise exception 'Cantidad inválida en la línea % del kit.', v_idx;
        end if;

        insert into public.product_kit_items (kit_id, component_product_id, quantity, created_at)
        values (p_kit_id, v_component_product_id, v_quantity, v_now);
    end loop;

    return true;

exception when others then
    raise exception 'update_kit_transaction: % (SQLSTATE=%)', sqlerrm, sqlstate;
end;
$function$;

REVOKE ALL ON FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid, p_notes text) FROM public;
REVOKE ALL ON FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid, p_notes text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid, p_notes text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid, p_notes text) TO service_role;

REVOKE ALL ON FUNCTION public.create_kit_transaction(p_kit_product jsonb, p_kit_items jsonb) FROM public;
REVOKE ALL ON FUNCTION public.create_kit_transaction(p_kit_product jsonb, p_kit_items jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_kit_transaction(p_kit_product jsonb, p_kit_items jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_kit_transaction(p_kit_product jsonb, p_kit_items jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.update_kit_transaction(p_kit_id uuid, p_kit_product_id uuid, p_kit_product jsonb, p_kit_items jsonb) FROM public;
REVOKE ALL ON FUNCTION public.update_kit_transaction(p_kit_id uuid, p_kit_product_id uuid, p_kit_product jsonb, p_kit_items jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_kit_transaction(p_kit_id uuid, p_kit_product_id uuid, p_kit_product jsonb, p_kit_items jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_kit_transaction(p_kit_id uuid, p_kit_product_id uuid, p_kit_product jsonb, p_kit_items jsonb) TO service_role;
