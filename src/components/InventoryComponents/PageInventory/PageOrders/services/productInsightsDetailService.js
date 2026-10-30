// Consulta a profundidad: stock por sucursal y ventas de un producto en un
// rango de fechas. La agregacion ocurre en el RPC get_product_branch_insights.

import { supabase } from "../../../../../lib/supabaseClient";

export const fetchProductBranchInsights = async ({
  productId,
  dateFrom,
  dateTo,
}) => {
  if (!productId || !dateFrom || !dateTo) {
    throw new Error("Parámetros de consulta incompletos.");
  }

  const { data, error } = await supabase.rpc("get_product_branch_insights", {
    p_product_id: productId,
    p_from: dateFrom.toISOString(),
    p_to: dateTo.toISOString(),
  });

  if (error) throw error;

  return data ?? [];
};
