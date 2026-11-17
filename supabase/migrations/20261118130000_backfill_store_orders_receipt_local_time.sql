-- Corrige la hora de los movimientos historicos de recepcion de pedidos.
-- Motivo: hasta 20261118120000, `receive_store_order` guardaba `now()` (UTC) en
-- `inventory_movements.created_at`, que no tiene zona y el kardex lee como hora
-- local. Las recepciones salian unas 5 horas adelantadas.
-- Alcance: solo filas 'Recepcion pedido %' cuyo `created_at` es todavia
-- identico a `store_orders.accepted_at` en UTC (la firma del bug). Es
-- idempotente: tras corregir ya no coinciden y una segunda corrida no toca nada.
-- En remoto al 17 nov 2026: 10 filas, todas de sucursales 'America/Cancun'.
-- Rollback (por las mismas filas, identificadas por pedido):
--   update public.inventory_movements m
--   set created_at = o.accepted_at at time zone 'UTC'
--   from public.store_orders o
--   where m.reason = 'Recepcion pedido ' || o.order_number
--     and m.branch_id = o.to_branch_id;

update public.inventory_movements m
set created_at = (m.created_at at time zone 'UTC')
  at time zone coalesce(b.timezone, 'America/Cancun')
from public.store_orders o
join public.branches b on b.id = o.to_branch_id
where m.reason = 'Recepcion pedido ' || o.order_number
  and m.branch_id = o.to_branch_id
  and m.movement_type = 'entry'
  and m.created_at = o.accepted_at at time zone 'UTC';
