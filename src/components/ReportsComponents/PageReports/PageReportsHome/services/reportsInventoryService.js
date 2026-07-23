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
        id,
        name,
        barcode,
        tracks_inventory
      )
    `)
    .eq("branch_id", branchId)
    .eq("is_active", true);

  if (error) throw error;

  return data || [];
};

export const buildInventoryAlerts = (
  inventoryRows,
) => {
  const outOfStockProducts = [];
  const lowStockProducts = [];

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

    const mappedProduct = {
      id: row.product_id,
      name:
        product.name ||
        product.barcode ||
        "Producto",
      barcode: product.barcode || "",
      stock,
      minStock,
    };

    if (stock <= 0) {
      outOfStockProducts.push(mappedProduct);
      continue;
    }

    if (minStock > 0 && stock <= minStock) {
      lowStockProducts.push(mappedProduct);
    }
  }

  outOfStockProducts.sort((first, second) =>
    first.name.localeCompare(second.name, "es"),
  );

  lowStockProducts.sort((first, second) => {
    if (first.stock !== second.stock) {
      return first.stock - second.stock;
    }

    return first.name.localeCompare(
      second.name,
      "es",
    );
  });

  return {
    outOfStockProducts,
    lowStockProducts,
  };
};