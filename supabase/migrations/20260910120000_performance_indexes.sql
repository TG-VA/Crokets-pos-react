-- Índices para acelerar queries de reportes.
-- Estos cubren las columnas más consultadas en los chunks `.in()` y filtros
-- de los reportes de Caja, Comisiones, Clientes, Rentabilidad y Dashboard.

-- sale_details: chunks por sale_id (Rentabilidad, Comisiones, Clientes, Dashboard)
CREATE INDEX IF NOT EXISTS idx_sale_details_sale_id
  ON public.sale_details (sale_id);

-- cash_movements: filtro por session_id (Caja)
CREATE INDEX IF NOT EXISTS idx_cash_movements_session_id
  ON public.cash_movements (session_id);

-- customer_points: filtro por customer_id (Clientes)
CREATE INDEX IF NOT EXISTS idx_customer_points_customer_id
  ON public.customer_points (customer_id);

-- sale_reward_redemptions: filtros por customer_id y sale_id (Clientes)
CREATE INDEX IF NOT EXISTS idx_sale_reward_redemptions_customer_id
  ON public.sale_reward_redemptions (customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_reward_redemptions_sale_id
  ON public.sale_reward_redemptions (sale_id);

-- cash_register_sessions: filtros del reporte de caja
CREATE INDEX IF NOT EXISTS idx_cash_sessions_branch_user
  ON public.cash_register_sessions (branch_id, user_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened_at
  ON public.cash_register_sessions (opened_at);

-- sale_payments: join con sales en RPCs de Caja
CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id
  ON public.sale_payments (sale_id);
