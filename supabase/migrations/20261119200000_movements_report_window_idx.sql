-- S3 del PR #230. El reporte de movimientos lee por paginas filtrando por sucursal y por una
-- ventana de fecha, con cursor sobre id. Sin estos indices Postgres recorre la tabla completa en
-- orden de id y descarta lo que no cumple el filtro, asi que cada pagina cuesta lo que mide la
-- tabla. Con ellos lee solo las filas del periodo y ordena por id ese subconjunto.
-- sale_reward_redemptions ya tiene indices por branch_id y por created_at.

create index if not exists idx_inventory_movements_branch_created_at
  on public.inventory_movements (branch_id, created_at);

-- Sin sucursal seleccionada el reporte filtra solo por fecha.
create index if not exists idx_inventory_movements_created_at
  on public.inventory_movements (created_at);

create index if not exists idx_sales_branch_sale_date
  on public.sales (branch_id, sale_date);
