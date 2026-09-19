import { supabase } from "../../../../../lib/supabaseClient";

import { toNumber } from "./reportsDashboardUtils";

export const getBranchInventory = async (branchId) => {
  let query = supabase
    .from("branch_inventory")
    .select(`
      product_id,
      stock,
      min_stock,
      is_active,
      has_been_stocked,
      branch_id,
      products:product_id (
        tracks_inventory
      )
    `)
    .eq("is_active", true);

  if (branchId && branchId !== "ALL" && branchId !== "Todas") {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
};

export const buildInventoryAlerts = (
  inventoryRows = [],
  isConsolidated = false
) => {
  if (!isConsolidated) {
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
  }

  const productMap = {};

  for (const row of inventoryRows) {
    const product = row.products || {};

    if (product.tracks_inventory === false) {
      continue;
    }

    const pId = row.product_id;
    if (!productMap[pId]) {
      productMap[pId] = {
        stock: 0,
        minStock: 0,
        hasBeenStocked: false,
      };
    }

    productMap[pId].stock += toNumber(row.stock);
    productMap[pId].minStock += toNumber(row.min_stock);

    if (row.has_been_stocked) {
      productMap[pId].hasBeenStocked = true;
    }
  }

  let outOfStockCount = 0;
  let lowStockCount = 0;

  for (const item of Object.values(productMap)) {
    if (!item.hasBeenStocked) continue;

    if (item.stock <= 0) {
      outOfStockCount += 1;
      continue;
    }

    if (item.minStock > 0 && item.stock <= item.minStock) {
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

