-- RPC que reemplaza las 3 queries paralelas de fetchInventoryReportData.
-- Devuelve items de inventario con valorizaciones y estados pre-calculados
-- en una sola consulta, evitando el truncamiento silencioso del limite
-- por defecto de Supabase (1000 filas).

CREATE OR REPLACE FUNCTION public.get_inventory_report_data(
  p_branch_id uuid DEFAULT NULL
)
RETURNS TABLE (
  product_id uuid,
  inventory_id uuid,
  barcode varchar,
  product_name varchar,
  cost_price numeric,
  sale_price numeric,
  tracks_inventory boolean,
  is_kit boolean,
  department_id uuid,
  department_name text,
  stock numeric,
  min_stock numeric,
  max_stock numeric,
  total_cost numeric,
  total_sale numeric,
  has_been_stocked boolean,
  has_inventory_record boolean,
  single_branch_cost numeric,
  single_branch_sale numeric,
  suggested_qty integer,
  estimated_investment numeric,
  status text,
  status_label text
)
LANGUAGE sql STABLE
AS $$
  WITH inv AS (
    SELECT
      bi.product_id,
      bi.id AS inventory_id,
      bi.branch_id,
      bi.stock, bi.min_stock, bi.max_stock,
      bi.cost_price, bi.sale_price,
      bi.is_active, bi.has_been_stocked
    FROM branch_inventory bi
    WHERE bi.is_active = true
      AND (p_branch_id IS NULL OR bi.branch_id = p_branch_id)
  ),
  agg AS (
    SELECT
      product_id,
      (array_agg(inventory_id ORDER BY inventory_id))[1] AS inventory_id,
      SUM(stock) AS stock,
      SUM(min_stock) AS min_stock,
      SUM(max_stock) AS max_stock,
      SUM(CASE WHEN stock > 0 THEN stock * cost_price ELSE 0 END) AS total_cost,
      SUM(CASE WHEN stock > 0 THEN stock * sale_price ELSE 0 END) AS total_sale,
      BOOL_OR(has_been_stocked) AS has_been_stocked,
      (array_agg(CASE WHEN p_branch_id IS NOT NULL THEN cost_price END ORDER BY cost_price NULLS LAST))[1] AS single_branch_cost,
      (array_agg(CASE WHEN p_branch_id IS NOT NULL THEN sale_price END ORDER BY sale_price NULLS LAST))[1] AS single_branch_sale
    FROM inv
    GROUP BY product_id
  )
  SELECT
    p.id AS product_id,
    a.inventory_id,
    p.barcode,
    p.name AS product_name,
    COALESCE(
      CASE WHEN a.stock > 0 AND a.total_cost > 0 THEN a.total_cost / a.stock ELSE NULL END,
      a.single_branch_cost, p.cost_price
    ) AS cost_price,
    COALESCE(
      CASE WHEN a.stock > 0 AND a.total_sale > 0 THEN a.total_sale / a.stock ELSE NULL END,
      a.single_branch_sale, p.sale_price
    ) AS sale_price,
    COALESCE(p.tracks_inventory, true) AND NOT p.is_kit AS tracks_inventory,
    p.is_kit,
    p.department_id,
    COALESCE(d.name, 'Sin departamento') AS department_name,
    COALESCE(a.stock, 0) AS stock,
    COALESCE(a.min_stock, 0) AS min_stock,
    COALESCE(a.max_stock, 0) AS max_stock,
    COALESCE(a.total_cost, 0) AS total_cost,
    COALESCE(a.total_sale, 0) AS total_sale,
    COALESCE(a.has_been_stocked, false) AS has_been_stocked,
    (a.inventory_id IS NOT NULL) AS has_inventory_record,
    a.single_branch_cost,
    a.single_branch_sale,
    CASE
      WHEN COALESCE(p.tracks_inventory, true) AND NOT p.is_kit
        AND (COALESCE(a.stock, 0) <= 0 OR COALESCE(a.stock, 0) <= COALESCE(a.min_stock, 0))
      THEN
        CASE
          WHEN COALESCE(a.max_stock, 0) > 0 THEN (a.max_stock - COALESCE(a.stock, 0))::integer
          WHEN COALESCE(a.min_stock, 0) > 0 THEN ((a.min_stock * 2) - COALESCE(a.stock, 0))::integer
          ELSE 1
        END
      ELSE 0
    END AS suggested_qty,
    0 AS estimated_investment,
    CASE
      WHEN NOT COALESCE(p.tracks_inventory, true) OR p.is_kit THEN 'no_control'
      WHEN NOT COALESCE(a.has_been_stocked, false) AND COALESCE(a.stock, 0) <= 0 THEN 'not_stocked'
      WHEN COALESCE(a.stock, 0) <= 0 THEN 'exhausted'
      WHEN COALESCE(a.min_stock, 0) > 0 AND COALESCE(a.stock, 0) <= COALESCE(a.min_stock, 0) THEN 'low'
      WHEN COALESCE(a.max_stock, 0) > 0 AND COALESCE(a.stock, 0) > COALESCE(a.max_stock, 0) THEN 'excess'
      ELSE 'optimal'
    END AS status,
    CASE
      WHEN NOT COALESCE(p.tracks_inventory, true) OR p.is_kit THEN
        CASE WHEN p.is_kit THEN 'Kit' ELSE 'Sin control' END
      WHEN NOT COALESCE(a.has_been_stocked, false) AND COALESCE(a.stock, 0) <= 0 THEN 'No surtido'
      WHEN COALESCE(a.stock, 0) <= 0 THEN 'Agotado'
      WHEN COALESCE(a.min_stock, 0) > 0 AND COALESCE(a.stock, 0) <= COALESCE(a.min_stock, 0) THEN 'Stock Bajo'
      WHEN COALESCE(a.max_stock, 0) > 0 AND COALESCE(a.stock, 0) > COALESCE(a.max_stock, 0) THEN 'Exceso'
      ELSE 'Optimo'
    END AS status_label
  FROM products p
  LEFT JOIN agg a ON a.product_id = p.id
  LEFT JOIN departments d ON d.id = p.department_id
  WHERE p.status = true
    AND (a.inventory_id IS NOT NULL OR p.is_global = true)
  ORDER BY p.name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_inventory_report_data(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_inventory_report_data(uuid) TO anon, authenticated;
