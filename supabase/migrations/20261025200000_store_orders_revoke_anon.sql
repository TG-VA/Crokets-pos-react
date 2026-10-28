-- Hardening de autorizacion en las RPCs de pedidos de abastecimiento.
-- Hallazgo: create_store_order y receive_store_order conservaban EXECUTE para
-- anon (default privileges de Supabase) y, siendo SECURITY DEFINER, aceptaban
-- p_user_id de un llamador sin sesion. Esta migracion:
-- - revoca EXECUTE a anon y PUBLIC, conservando authenticated y service_role;
-- - solo acepta p_user_id cuando el rol es service_role; sin auth.uid() ni
--   service_role la funcion rechaza la llamada (patron de 20260917200000).
-- El resto de cada cuerpo es la definicion vigente en remoto.

CREATE OR REPLACE FUNCTION public.create_store_order(p_order_name text, p_from_branch_id uuid, p_to_branch_id uuid, p_user_id uuid, p_notes text, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := coalesce(
    auth.uid(),
    case when auth.role() = 'service_role' then p_user_id end
  );
  v_order_id uuid;
  v_order_number text;
  v_day text := to_char(now() at time zone 'America/Cancun', 'YYYYMMDD');
  v_sequence integer;
  v_attempt integer;
  v_item jsonb;
  v_product_id uuid;
  v_product_name text;
  v_barcode text;
  v_department_id uuid;
  v_department_name text;
  v_cost_price numeric;
  v_expected numeric;
  v_departments text[];
begin
  if v_actor is null then
    raise exception 'Se requiere un usuario autenticado para crear el pedido.';
  end if;

  if nullif(trim(p_order_name), '') is null then
    raise exception 'El nombre del pedido es obligatorio.';
  end if;

  if p_from_branch_id is null or p_to_branch_id is null then
    raise exception 'Las sucursales de origen y destino son obligatorias.';
  end if;

  if p_from_branch_id = p_to_branch_id then
    raise exception 'La sucursal de origen y destino deben ser diferentes.';
  end if;

  if not exists (select 1 from public.branches where id = p_to_branch_id) then
    raise exception 'La sucursal de destino no existe.';
  end if;

  if auth.uid() is not null
    and not public._user_can_access_branch(p_from_branch_id) then
    raise exception 'No tienes acceso a la sucursal de origen.'
      using errcode = '42501';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido debe incluir al menos un producto.';
  end if;

  perform pg_advisory_xact_lock(hashtext('store_orders:folio:' || v_day));

  select count(*) into v_sequence
  from public.store_orders
  where order_number like 'PED-' || v_day || '-%';

  for v_attempt in 1..5 loop
    v_sequence := v_sequence + 1;
    v_order_number :=
      'PED-' || v_day || '-' || lpad(v_sequence::text, 4, '0');

    begin
      insert into public.store_orders (
        order_number,
        order_name,
        from_branch_id,
        to_branch_id,
        created_by_user_id,
        status,
        notes
      )
      values (
        v_order_number,
        upper(trim(p_order_name)),
        p_from_branch_id,
        p_to_branch_id,
        v_actor,
        'pending',
        nullif(trim(p_notes), '')
      )
      returning id into v_order_id;

      exit;
    exception when unique_violation then
      v_order_id := null;
    end;
  end loop;

  if v_order_id is null then
    raise exception 'No fue posible generar el folio del pedido.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := nullif(v_item->>'productId', '')::uuid;
    v_expected := nullif(v_item->>'expectedQty', '')::numeric;

    if v_product_id is null then
      raise exception 'Cada partida debe incluir un producto.';
    end if;

    if v_expected is null or v_expected <= 0 then
      raise exception 'La cantidad esperada debe ser mayor a cero.';
    end if;

    if v_expected <> trunc(v_expected) then
      raise exception 'La cantidad esperada debe ser un numero entero.';
    end if;

    select
      p.name,
      p.barcode,
      p.department_id,
      d.name,
      coalesce(p.cost_price, 0)
    into
      v_product_name,
      v_barcode,
      v_department_id,
      v_department_name,
      v_cost_price
    from public.products p
    left join public.departments d on d.id = p.department_id
    where p.id = v_product_id;

    if not found then
      raise exception 'El producto % no existe.', v_product_id;
    end if;

    insert into public.store_order_items (
      order_id,
      product_id,
      barcode,
      product_name,
      department_id,
      department_name,
      expected_qty,
      cost_price
    )
    values (
      v_order_id,
      v_product_id,
      v_barcode,
      v_product_name,
      v_department_id,
      v_department_name,
      v_expected,
      v_cost_price
    );
  end loop;

  select array_agg(distinct department_name order by department_name)
  into v_departments
  from public.store_order_items
  where order_id = v_order_id and department_name is not null;

  update public.store_orders
  set departments_summary = coalesce(v_departments, '{}')
  where id = v_order_id;

  return jsonb_build_object(
    'success', true,
    'orderId', v_order_id,
    'orderNumber', v_order_number
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.receive_store_order(p_order_id uuid, p_to_branch_id uuid, p_user_id uuid, p_received_qty_map jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      discrepancy_notes = v_notes
  where id = p_order_id;

  return jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'status', v_status
  );
end;
$function$;

revoke all on function public.create_store_order(text, uuid, uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.create_store_order(text, uuid, uuid, uuid, text, jsonb) to authenticated, service_role;

revoke all on function public.receive_store_order(uuid, uuid, uuid, jsonb) from public, anon;
grant execute on function public.receive_store_order(uuid, uuid, uuid, jsonb) to authenticated, service_role;
