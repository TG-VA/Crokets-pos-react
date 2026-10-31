-- Detalle de producto por sucursal: maximo, canjes y orden por stock.
--
-- Amplia get_product_branch_insights (20261030120000):
--   * max_stock: maximo configurado en la sucursal.
--   * units_sold: unidades vendidas SIN canje.
--   * redeemed_units: unidades canjeadas por puntos, tomadas de
--     sale_reward_redemptions (canjes no revertidos de ventas completadas).
--   * orden: de mayor a menor stock, con el nombre como desempate.
--
-- Cada canje tambien genera una linea en sale_details, por lo que las
-- unidades vendidas se calculan como total de lineas menos canjeadas. El
-- importe sigue siendo el total cobrado en las lineas de sale_details.
--
-- Cambia el tipo de retorno, por eso se elimina y se recrea la funcion.

DROP FUNCTION IF EXISTS public.get_product_branch_insights(uuid, timestamptz, timestamptz);

CREATE FUNCTION public.get_product_branch_insights(
    p_product_id uuid,
    p_from timestamptz,
    p_to timestamptz
)
RETURNS TABLE (
    branch_id uuid,
    branch_name text,
    stock numeric,
    min_stock numeric,
    max_stock numeric,
    units_sold numeric,
    redeemed_units numeric,
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
            SUM(sd.quantity)::numeric AS line_units,
            SUM(sd.total_price)::numeric AS sold_revenue
        FROM public.sale_details sd
        JOIN public.sales s ON s.id = sd.sale_id
        WHERE sd.product_id = p_product_id
          AND s.status = 'completed'
          AND s.created_at >= p_from
          AND s.created_at <= p_to
        GROUP BY s.branch_id
    ),
    redeemed AS (
        SELECT
            s.branch_id AS redeemed_branch_id,
            SUM(r.quantity)::numeric AS redeemed_qty
        FROM public.sale_reward_redemptions r
        JOIN public.sales s ON s.id = r.sale_id
        WHERE r.product_id = p_product_id
          AND r.status = 'applied'
          AND r.reversed_at IS NULL
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
        bi.max_stock::numeric,
        GREATEST(
            COALESCE(sold.line_units, 0) - COALESCE(redeemed.redeemed_qty, 0),
            0
        ),
        COALESCE(redeemed.redeemed_qty, 0),
        COALESCE(sold.sold_revenue, 0)
    FROM public.branches b
    LEFT JOIN public.branch_inventory bi
        ON bi.branch_id = b.id
       AND bi.product_id = p_product_id
    LEFT JOIN sold ON sold.sold_branch_id = b.id
    LEFT JOIN redeemed ON redeemed.redeemed_branch_id = b.id
    WHERE b.is_active = true
       OR COALESCE(sold.line_units, 0) > 0
       OR COALESCE(redeemed.redeemed_qty, 0) > 0
    ORDER BY COALESCE(bi.stock, 0) DESC, b.name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_product_branch_insights(uuid, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_product_branch_insights(uuid, timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_product_branch_insights(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_branch_insights(uuid, timestamptz, timestamptz) TO service_role;
