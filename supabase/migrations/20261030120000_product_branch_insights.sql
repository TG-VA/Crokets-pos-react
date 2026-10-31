-- Detalle de producto por sucursal para el modal de Pedidos.
--
-- get_product_branch_insights devuelve, por sucursal, el stock actual del
-- producto y las unidades/importe vendidos en el rango indicado. Solo cuentan
-- ventas con status 'completed' (misma regla que el reporte de productos).
--
-- SECURITY INVOKER: las politicas RLS vigentes ya permiten leer entre
-- sucursales (branch_inventory_select exige can_view_branch; sales y
-- sale_details permiten SELECT a authenticated), por lo que la funcion no
-- amplia ningun acceso. La agregacion en SQL evita el tope de filas de
-- PostgREST en rangos largos.

CREATE OR REPLACE FUNCTION public.get_product_branch_insights(
    p_product_id uuid,
    p_from timestamptz,
    p_to timestamptz
)
RETURNS TABLE (
    branch_id uuid,
    branch_name text,
    stock numeric,
    min_stock numeric,
    units_sold numeric,
    revenue numeric
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Se requiere un usuario autenticado.';
    END IF;

    IF p_product_id IS NULL OR p_from IS NULL OR p_to IS NULL THEN
        RAISE EXCEPTION 'Producto y rango de fechas son obligatorios.';
    END IF;

    IF p_from > p_to THEN
        RAISE EXCEPTION 'La fecha inicial no puede ser mayor a la final.';
    END IF;

    RETURN QUERY
    WITH sold AS (
        SELECT
            s.branch_id AS sold_branch_id,
            SUM(sd.quantity)::numeric AS sold_units,
            SUM(sd.total_price)::numeric AS sold_revenue
        FROM public.sale_details sd
        JOIN public.sales s ON s.id = sd.sale_id
        WHERE sd.product_id = p_product_id
          AND s.status = 'completed'
          AND s.created_at >= p_from
          AND s.created_at <= p_to
        GROUP BY s.branch_id
    )
    SELECT
        b.id,
        b.name::text,
        COALESCE(bi.stock, 0)::numeric,
        bi.min_stock::numeric,
        COALESCE(sold.sold_units, 0),
        COALESCE(sold.sold_revenue, 0)
    FROM public.branches b
    LEFT JOIN public.branch_inventory bi
        ON bi.branch_id = b.id
       AND bi.product_id = p_product_id
    LEFT JOIN sold ON sold.sold_branch_id = b.id
    WHERE b.is_active = true
       OR COALESCE(sold.sold_units, 0) > 0
    ORDER BY b.name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_product_branch_insights(uuid, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_product_branch_insights(uuid, timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_product_branch_insights(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_branch_insights(uuid, timestamptz, timestamptz) TO service_role;
