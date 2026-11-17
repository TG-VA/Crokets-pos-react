-- Una sucursal admin (branches.branch_type = 'admin') no vende ni tiene stock. Se rechaza como
-- sucursal de stock en ventas, movimientos de inventario, traspasos y pedidos de abastecimiento.
-- La validacion vive en triggers BEFORE INSERT/UPDATE de las tablas que escriben las RPCs
-- transaccionales (create_sale_transaction, create_transfer_order, receive/cancel de traspasos,
-- create_store_order/receive_store_order y los movimientos de inventario). Asi corre dentro de la
-- misma transaccion de cada RPC y tambien cubre escrituras directas: la UI sola no basta.
-- branch_inventory no se valida aqui: el alta de productos crea su fila (ver KNOWN_ISSUES).
-- Requiere 20261115120000_branches_branch_type.sql. Hoy ADM-BREN no tiene ventas, movimientos,
-- traspasos ni pedidos, asi que ninguna fila existente queda en conflicto.
-- Rollback:
--   drop trigger if exists trg_sales_operational_branch on public.sales;
--   drop trigger if exists trg_inventory_movements_operational_branch on public.inventory_movements;
--   drop trigger if exists trg_inventory_transfers_operational_branch on public.inventory_transfers;
--   drop trigger if exists trg_store_orders_operational_branch on public.store_orders;
--   drop function if exists public.tg_reject_admin_stock_branch();
--   drop function if exists public.assert_operational_branch(uuid, text);

create or replace function public.assert_operational_branch(
  p_branch_id uuid,
  p_role text
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if p_branch_id is null then
    return;
  end if;

  select b.code
    into v_code
  from public.branches b
  where b.id = p_branch_id
    and b.branch_type = 'admin';

  if v_code is not null then
    raise exception 'La sucursal % es administrativa y no puede usarse como %.', v_code, p_role
      using errcode = 'P0001',
            hint = 'Elige una sucursal operativa.';
  end if;
end;
$$;

revoke all on function public.assert_operational_branch(uuid, text) from public, anon, authenticated;

-- TG_ARGV: pares (columna, rol). Ej.: 'from_branch_id', 'origen del traspaso'.
create or replace function public.tg_reject_admin_stock_branch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_index integer := 0;
begin
  while v_index < tg_nargs loop
    perform public.assert_operational_branch(
      (to_jsonb(new) ->> tg_argv[v_index])::uuid,
      tg_argv[v_index + 1]
    );
    v_index := v_index + 2;
  end loop;

  return new;
end;
$$;

revoke all on function public.tg_reject_admin_stock_branch() from public, anon, authenticated;

drop trigger if exists trg_sales_operational_branch on public.sales;
create trigger trg_sales_operational_branch
  before insert or update of branch_id on public.sales
  for each row execute function public.tg_reject_admin_stock_branch(
    'branch_id', 'sucursal de venta'
  );

drop trigger if exists trg_inventory_movements_operational_branch on public.inventory_movements;
create trigger trg_inventory_movements_operational_branch
  before insert or update of branch_id on public.inventory_movements
  for each row execute function public.tg_reject_admin_stock_branch(
    'branch_id', 'sucursal de un movimiento de inventario'
  );

drop trigger if exists trg_inventory_transfers_operational_branch on public.inventory_transfers;
create trigger trg_inventory_transfers_operational_branch
  before insert or update of from_branch_id, to_branch_id on public.inventory_transfers
  for each row execute function public.tg_reject_admin_stock_branch(
    'from_branch_id', 'origen del traspaso',
    'to_branch_id', 'destino del traspaso'
  );

drop trigger if exists trg_store_orders_operational_branch on public.store_orders;
create trigger trg_store_orders_operational_branch
  before insert or update of from_branch_id, to_branch_id on public.store_orders
  for each row execute function public.tg_reject_admin_stock_branch(
    'from_branch_id', 'origen del pedido',
    'to_branch_id', 'destino del pedido'
  );
