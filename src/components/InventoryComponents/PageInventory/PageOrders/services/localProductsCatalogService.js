// Consulta de productos locales (no globales) con las sucursales que los
// manejan, para mostrarlos en el buscador de pedidos como no seleccionables.

import { supabase } from "../../../../../lib/supabaseClient";
import { fetchAllPages } from "../../../../../services/supabase/paginatedQuery";
import { groupLocalProductsByBranch } from "../utils/localProductsCalculationService";

export const fetchLocalProductsCatalog = async () => {
  const { data, error } = await fetchAllPages(() =>
    supabase
      .from("branch_inventory")
      .select(
        `
      id,
      product_id,
      branches ( name ),
      products!inner (
        id,
        barcode,
        name,
        is_global,
        is_kit,
        status,
        department:departments ( name )
      )
    `
      )
      .eq("products.is_global", false)
      .eq("products.status", true)
  );

  if (error) throw error;

  return groupLocalProductsByBranch(data);
};
