-- RPC que reemplaza el N+1 de fetchCashSessions.
-- Devuelve sesiones de caja enriquecidas con totales de ventas (efectivo/tarjeta)
-- pre-calculados en el servidor, eliminando la necesidad de 1 query por sesión.

CREATE OR REPLACE FUNCTION public.get_cash_report_sessions(
  p_branch_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_cashier_id uuid DEFAULT NULL,
  p_session_status text DEFAULT NULL
)
RETURNS TABLE (
  session_id uuid,
  user_id uuid,
  username text,
  branch_id uuid,
  branch_name text,
  branch_timezone text,
  opening_amount numeric,
  closing_amount numeric,
  opened_at timestamptz,
  closed_at timestamptz,
  session_status varchar,
  difference numeric,
  cash_sales numeric,
  card_sales numeric,
  total_sales numeric,
  cash_cuts jsonb
)
LANGUAGE sql STABLE
AS $$
  WITH filtered_sessions AS (
    SELECT s.*, u.username, b.name AS branch_name, b.timezone AS branch_timezone
    FROM cash_register_sessions s
    JOIN users u ON u.id = s.user_id
    JOIN branches b ON b.id = s.branch_id
    WHERE (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND (p_cashier_id IS NULL OR s.user_id = p_cashier_id)
      AND (p_session_status IS NULL OR s.status = p_session_status)
      AND (p_start_date IS NULL OR s.opened_at >= p_start_date)
      AND (p_end_date IS NULL OR s.opened_at <= p_end_date)
    ORDER BY s.opened_at DESC
  ),
  session_payments AS (
    SELECT
      sl.user_id,
      sl.branch_id,
      sl.created_at,
      sp.amount,
      COALESCE(pm.affects_cash, false) AS affects_cash
    FROM sale_payments sp
    INNER JOIN sales sl ON sl.id = sp.sale_id
    LEFT JOIN payment_methods pm ON pm.id = sp.payment_method_id
    WHERE sl.status IN ('completed', 'partial_refund')
  )
  SELECT
    fs.id AS session_id,
    fs.user_id,
    fs.username,
    fs.branch_id,
    fs.branch_name,
    fs.branch_timezone,
    fs.opening_amount,
    fs.closing_amount,
    fs.opened_at,
    fs.closed_at,
    fs.status AS session_status,
    fs.difference,
    COALESCE(SUM(CASE WHEN sp2.affects_cash THEN sp2.amount ELSE 0 END), 0) AS cash_sales,
    COALESCE(SUM(CASE WHEN NOT sp2.affects_cash THEN sp2.amount ELSE 0 END), 0) AS card_sales,
    COALESCE(SUM(sp2.amount), 0) AS total_sales,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', cc.id, 'cut_type', cc.cut_type,
        'expected_amount', cc.expected_amount, 'counted_amount', cc.counted_amount,
        'difference', cc.difference, 'notes', cc.notes, 'created_at', cc.created_at
      ) ORDER BY cc.created_at), '[]'::jsonb)
      FROM cash_cuts cc WHERE cc.cash_register_session_id = fs.id
    ) AS cash_cuts
  FROM filtered_sessions fs
  LEFT JOIN session_payments sp2
    ON sp2.user_id = fs.user_id
    AND sp2.branch_id = fs.branch_id
    AND sp2.created_at >= fs.opened_at
    AND sp2.created_at <= COALESCE(fs.closed_at, now())
  GROUP BY fs.id, fs.user_id, fs.username, fs.branch_id, fs.branch_name,
           fs.branch_timezone, fs.opening_amount, fs.closing_amount,
           fs.opened_at, fs.closed_at, fs.status, fs.difference
  ORDER BY fs.opened_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_cash_report_sessions(uuid, timestamptz, timestamptz, uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_cash_report_sessions(uuid, timestamptz, timestamptz, uuid, text) TO anon, authenticated;
