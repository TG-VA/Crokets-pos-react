// Consulta de productos locales (no globales) con las sucursales que los
// manejan, para mostrarlos en el buscador de pedidos como no seleccionables.

import { supabase } from "../../../../../lib/supabaseClient";
import { groupLocalProductsByBranch } from "../utils/localProductsCalculationService";

const MAX_LOCAL_ROWS = 5000;

export const fetchLocalProductsCatalog = async () => {
  const { data, error } = await supabase
    .from("branch_inventory")
    .select(
      `
      product_id,
      branches ( name ),
      products!inner (
        id,
        barcode,
        name,
        is_global,
        status,
        department:departments ( name )
      )
    `
    )
    .eq("products.is_global", false)
    .eq("products.status", true)
    .limit(MAX_LOCAL_ROWS);

  if (error) throw error;

  return groupLocalProductsByBranch(data);
};
