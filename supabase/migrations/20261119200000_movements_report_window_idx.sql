-- El reporte de movimientos lee por paginas filtrando por sucursal y por una ventana de fecha,
-- con cursor sobre id. Estos indices dan al planner un acceso por (branch_id, fecha) para que no
-- tenga que recorrer la tabla completa en orden de id; que los elija frente a la llave primaria
-- depende del tamano del periodo.
-- sale_reward_redemptions ya tiene indices por branch_id y por created_at.

create index if not exists idx_inventory_movements_branch_created_at
  on public.inventory_movements (branch_id, created_at);

-- Sin sucursal seleccionada el reporte filtra solo por fecha.
create index if not exists idx_inventory_movements_created_at
  on public.inventory_movements (created_at);

create index if not exists idx_sales_branch_sale_date
  on public.sales (branch_id, sale_date);
