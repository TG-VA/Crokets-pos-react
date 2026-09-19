-- RPC que devuelve filas comisionables paginadas.
-- Reemplaza el fetch secuencial de sales + sale_details en chunks
-- del reporte de Comisiones, calculando comisiones en el servidor.

CREATE OR REPLACE FUNCTION public.get_commissions_report_data(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_branch_id uuid DEFAULT NULL,
  p_cashier_id uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50
)
RETURNS TABLE (
  detail_id uuid,
  sale_id uuid,
  ticket_number text,
  created_at timestamptz,
  branch_id uuid,
  branch_name text,
  cashier_id uuid,
  cashier_name text,
  product_id uuid,
  barcode varchar,
  product_name varchar,
  department_id uuid,
  department_name text,
  quantity integer,
  unit_price numeric,
  catalog_price numeric,
  discount_amount numeric,
  discount_type varchar,
  has_discount boolean,
  total_price numeric,
  has_commission boolean,
  commission_amount numeric,
  commission_type varchar,
  commission_value numeric,
  rule_label text,
  total_count bigint
)
LANGUAGE sql STABLE
AS $$
  WITH filtered_sales AS (
    SELECT s.id, s.branch_id, s.user_id, s.created_at,
           b.name AS branch_name, u.username AS cashier_name
    FROM sales s
    JOIN branches b ON b.id = s.branch_id
    JOIN users u ON u.id = s.user_id
    WHERE s.created_at >= p_start_date
      AND s.created_at <= p_end_date
      AND s.status != 'canceled'
      AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND (p_cashier_id IS NULL OR s.user_id = p_cashier_id)
  ),
  detail_rows AS (
    SELECT
      sd.id AS detail_id, sd.sale_id, sd.product_id, sd.quantity,
      sd.unit_price, sd.discount_amount, sd.discount_type, sd.total_price,
      p.barcode, p.name AS product_name, p.sale_price AS catalog_price,
      p.department_id, p.commission_enabled, p.commission_type,
      p.commission_value, p.commission_percent,
      d.name AS department_name,
      d.commission_enabled AS dept_commission_enabled,
      d.commission_type AS dept_commission_type,
      d.commission_value AS dept_commission_value
    FROM sale_details sd
    JOIN products p ON p.id = sd.product_id
    LEFT JOIN departments d ON d.id = p.department_id
    WHERE sd.sale_id IN (SELECT id FROM filtered_sales)
      AND (p_department_id IS NULL OR p.department_id = p_department_id)
  ),
  computed AS (
    SELECT
      dr.*,
      fs.branch_id, fs.branch_name, fs.user_id AS cashier_id,
      fs.cashier_name, fs.created_at,
      upper(substring(fs.id::text, 1, 8)) AS ticket_number,
      GREATEST(COALESCE(dr.discount_amount, 0), 0) AS effective_discount,
      CASE
        WHEN dr.commission_enabled THEN
          CASE dr.commission_type
            WHEN 'percent' THEN dr.unit_price * dr.quantity * (COALESCE(dr.commission_percent, dr.commission_value, 0) / 100.0)
            ELSE COALESCE(dr.commission_value, 0) * dr.quantity
          END
        WHEN dr.dept_commission_enabled THEN
          CASE dr.dept_commission_type
            WHEN 'percent' THEN dr.unit_price * dr.quantity * (COALESCE(dr.dept_commission_value, 0) / 100.0)
            ELSE COALESCE(dr.dept_commission_value, 0) * dr.quantity
          END
        ELSE 0
      END AS commission_amount,
      (dr.commission_enabled OR dr.dept_commission_enabled) AS has_commission
    FROM detail_rows dr
    JOIN filtered_sales fs ON fs.id = dr.sale_id
  )
  SELECT
    c.detail_id, c.sale_id, c.ticket_number, c.created_at,
    c.branch_id, c.branch_name, c.cashier_id, c.cashier_name,
    c.product_id, c.barcode, c.product_name,
    c.department_id, c.department_name,
    c.quantity, c.unit_price, c.catalog_price,
    c.effective_discount AS discount_amount, c.discount_type,
    c.effective_discount > 0 AS has_discount,
    c.total_price,
    c.has_commission, c.commission_amount,
    c.commission_type, c.commission_value,
    CASE
      WHEN c.has_commission THEN
        c.commission_type || ': ' || c.commission_value ||
        CASE WHEN c.commission_type = 'percent' THEN '%' ELSE '' END
      ELSE 'Sin comision'
    END AS rule_label,
    count(*) OVER () AS total_count
  FROM computed c
  ORDER BY c.created_at DESC
  LIMIT greatest(1, coalesce(p_page_size, 50))
  OFFSET (greatest(1, coalesce(p_page, 1)) - 1) * greatest(1, coalesce(p_page_size, 50));
$$;

REVOKE ALL ON FUNCTION public.get_commissions_report_data(timestamptz, timestamptz, uuid, uuid, uuid, integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_commissions_report_data(timestamptz, timestamptz, uuid, uuid, uuid, integer, integer) TO anon, authenticated;
