-- Los kits no se pueden incluir en pedidos de abastecimiento.
--
-- Un kit no maneja inventario propio: su disponibilidad depende de los
-- productos que lo componen, asi que pedirlo no tiene efecto sobre el stock.
-- La interfaz ya los excluye; esta migracion agrega la validacion en el
-- servidor para que ninguna llamada directa al RPC pueda saltarsela.
--
-- Cambio unico respecto de la definicion vigente (20261025200000): la partida
-- se rechaza si products.is_kit es verdadero. No altera datos existentes ni el
-- contrato de la funcion (misma firma y mismo retorno), por lo que es seguro
-- con clientes de versiones anteriores: unicamente fallan los pedidos que
-- incluyan un kit. Los pedidos ya creados no se tocan.
--
-- Rollback: volver a aplicar la definicion de create_store_order de
-- 20261025200000_store_orders_revoke_anon.sql.

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
  v_is_kit boolean;
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
      coalesce(p.cost_price, 0),
      coalesce(p.is_kit, false)
    into
      v_product_name,
      v_barcode,
      v_department_id,
      v_department_name,
      v_cost_price,
      v_is_kit
    from public.products p
    left join public.departments d on d.id = p.department_id
    where p.id = v_product_id;

    if not found then
      raise exception 'El producto % no existe.', v_product_id;
    end if;

    if v_is_kit then
      raise exception 'El producto "%" es un kit y no se puede pedir: su inventario depende de sus componentes.', v_product_name;
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

revoke all on function public.create_store_order(text, uuid, uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.create_store_order(text, uuid, uuid, uuid, text, jsonb) to authenticated, service_role;
