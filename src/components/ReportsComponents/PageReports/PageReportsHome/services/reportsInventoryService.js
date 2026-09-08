import { supabase } from "../../../../../lib/supabaseClient";

import { toNumber } from "./reportsDashboardUtils";

export const getBranchInventory = async (branchId) => {
  const { data, error } = await supabase
    .from("branch_inventory")
    .select(`
      product_id,
      stock,
      min_stock,
      is_active,
      has_been_stocked,
      products:product_id (
        tracks_inventory
      )
    `)
    .eq("branch_id", branchId)
    .eq("is_active", true);

  if (error) throw error;

  return data || [];
};

export const buildInventoryAlerts = (
  inventoryRows = []
) => {
  let outOfStockCount = 0;
  let lowStockCount = 0;

  for (const row of inventoryRows) {
    const product = row.products || {};

    if (product.tracks_inventory === false) {
      continue;
    }

    if (row.has_been_stocked === false) {
      continue;
    }

    const stock = toNumber(row.stock);
    const minStock = toNumber(row.min_stock);

    if (stock <= 0) {
      outOfStockCount += 1;
      continue;
    }

    if (minStock > 0 && stock <= minStock) {
      lowStockCount += 1;
    }
  }

  return {
    outOfStockCount,
    lowStockCount,
    outOfStockProducts: { length: outOfStockCount },
    lowStockProducts: { length: lowStockCount },
  };
};
