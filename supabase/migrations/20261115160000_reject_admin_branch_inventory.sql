-- Cierra el hueco que dejo 20261115140000: una sucursal admin tampoco puede tener filas en
-- branch_inventory. El alta y la edicion de productos ya no escriben inventario desde una
-- terminal admin, y la importacion (import_products_transaction, que inserta en p_branch_id)
-- falla con el mismo error claro en lugar de dejar stock en la sucursal admin.
-- Requiere 20261115140000_reject_admin_branch_stock.sql (tg_reject_admin_stock_branch).
-- Hoy ADM-BREN no tiene filas en branch_inventory.
-- Rollback:
--   drop trigger if exists trg_branch_inventory_operational_branch on public.branch_inventory;

drop trigger if exists trg_branch_inventory_operational_branch on public.branch_inventory;
create trigger trg_branch_inventory_operational_branch
  before insert or update of branch_id on public.branch_inventory
  for each row execute function public.tg_reject_admin_stock_branch(
    'branch_id', 'sucursal de inventario'
  );
