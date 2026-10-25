-- Valida los constraints de cantidades enteras del modulo de pedidos.
-- Se agregaron NOT VALID en 20261024120000 para no romper filas historicas.
-- El pre-check sobre store_order_items dio 0 filas fraccionarias.
-- VALIDATE escanea la tabla y deja convalidated = true.

alter table public.store_order_items
  validate constraint store_order_items_expected_qty_integral;

alter table public.store_order_items
  validate constraint store_order_items_received_qty_integral;
