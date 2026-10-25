-- Modulo de pedidos de abastecimiento entre sucursales.
-- Incluye tablas, indices, RLS y RPCs transaccionales de creacion y recepcion.

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  order_number varchar(24) not null unique,
  order_name varchar(160) not null,
  from_branch_id uuid not null references public.branches(id),
  to_branch_id uuid not null references public.branches(id),
  created_by_user_id uuid not null references public.users(id),
  received_by_user_id uuid references public.users(id),
  status varchar(24) not null default 'pending',
  departments_summary text[] not null default '{}',
  notes text,
  discrepancy_notes text,
  sent_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_orders_status_check
    check (status in ('pending', 'accepted', 'accepted_with_difference', 'cancelled')),
  constraint store_orders_branches_check
    check (from_branch_id <> to_branch_id)
);

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  barcode varchar(120),
  product_name varchar(240) not null,
  department_id uuid references public.departments(id),
  department_name varchar(160),
  expected_qty numeric(18, 4) not null,
  received_qty numeric(18, 4),
  difference_qty numeric(18, 4),
  cost_price numeric(18, 4) not null default 0,
  created_at timestamptz not null default now(),
  constraint store_order_items_expected_qty_check check (expected_qty > 0),
  constraint store_order_items_received_qty_check
    check (received_qty is null or received_qty >= 0),
  constraint store_order_items_order_product_unique unique (order_id, product_id)
);

create index if not exists store_orders_status_idx
  on public.store_orders (status, sent_at desc);

create index if not exists store_orders_to_branch_idx
  on public.store_orders (to_branch_id, status);

create index if not exists store_orders_from_branch_idx
  on public.store_orders (from_branch_id);

create index if not exists store_order_items_order_idx
  on public.store_order_items (order_id);

create or replace function public.touch_store_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists store_orders_touch_updated_at on public.store_orders;

create trigger store_orders_touch_updated_at
before update on public.store_orders
for each row
execute function public.touch_store_orders_updated_at();

alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;

drop policy if exists "store_orders_select_authenticated" on public.store_orders;
create policy "store_orders_select_authenticated"
on public.store_orders for select
to authenticated
using (true);

drop policy if exists "store_order_items_select_authenticated" on public.store_order_items;
create policy "store_order_items_select_authenticated"
on public.store_order_items for select
to authenticated
using (true);

grant select on public.store_orders to authenticated;
grant select on public.store_order_items to authenticated;

create or replace function public.create_store_order(
  p_order_name text,
  p_from_branch_id uuid,
  p_to_branch_id uuid,
  p_user_id uuid,
  p_notes text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := coalesce(auth.uid(), p_user_id);
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
        trim(p_order_name),
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
$$;

create or replace function public.receive_store_order(
  p_order_id uuid,
  p_to_branch_id uuid,
  p_user_id uuid,
  p_received_qty_map jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := coalesce(auth.uid(), p_user_id);
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
$$;

revoke all on function public.create_store_order(text, uuid, uuid, uuid, text, jsonb) from public;
revoke all on function public.receive_store_order(uuid, uuid, uuid, jsonb) from public;

grant execute on function public.create_store_order(text, uuid, uuid, uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.receive_store_order(uuid, uuid, uuid, jsonb) to authenticated, service_role;
