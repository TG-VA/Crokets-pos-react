-- Fija el search_path de las tres sobrecargas de create_sale_transaction a 'public'.
--
-- KNOWN_ISSUES.md #49 (SEC-5): la RPC es SECURITY DEFINER y, sin un search_path
-- fijado, un objeto creado por el llamador en un esquema previo del path podia
-- sombrear las referencias no calificadas dentro del cuerpo y ejecutarse con los
-- privilegios del definer (vector de escalada de privilegios).
--
-- Se redefinen las tres sobrecargas preservando EXACTAMENTE sus cuerpos
-- (unica adicion: la clausula SET a nivel de funcion) y se reafirman los grants
-- minimos: revocacion de anon/public y EXECUTE solo a authenticated y
-- service_role.
--
-- Origen de cada cuerpo:
--   9 y 10 parametros  -> 20260917200000_harden_transactional_rpcs.sql
--   11 parametros      -> 20260921170000_freeze_sale_details_commissions.sql
--   (variante vigente con congelamiento de snapshot de comision en sale_details)

CREATE OR REPLACE FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
      commission_amount
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
      v_comm_amount
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

REVOKE ALL ON FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb) FROM public;
REVOKE ALL ON FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid) FROM public;
REVOKE ALL ON FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid) TO service_role;

REVOKE ALL ON FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid, p_notes text) FROM public;
REVOKE ALL ON FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid, p_notes text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid, p_notes text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sale_transaction(p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid, p_notes text) TO service_role;
