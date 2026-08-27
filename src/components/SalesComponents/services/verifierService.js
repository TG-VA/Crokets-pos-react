import { supabase } from "../../../lib/supabaseClient";

export const applyDiscountToPrice = (salePrice, discountRow) => {
  const price = Number(salePrice || 0);

  if (!discountRow?.enabled || Number(discountRow.discount_percent || 0) <= 0) {
    return {
      finalPrice: price,
      discountEnabled: false,
      discountPercent: 0,
      discountConcept: "",
    };
  }

  const discountPercent = Number(discountRow.discount_percent);
  const finalPrice = Math.max(price - price * (discountPercent / 100), 0);

  return {
    finalPrice: Number(finalPrice.toFixed(2)),
    discountEnabled: true,
    discountPercent,
    discountConcept: discountRow.discount_concept || "",
  };
};

export const fetchProductDiscount = async (productId) => {
  const { data, error } = await supabase
    .from("product_discounts")
    .select("enabled, discount_percent, discount_concept")
    .eq("product_id", productId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
};

export const fetchKitData = async (productId) => {
  const { data: kitRow, error: kitError } = await supabase
    .from("product_kits")
    .select("id, is_active")
    .eq("kit_product_id", productId)
    .maybeSingle();

  if (kitError) throw kitError;

  if (!kitRow?.id) {
    return { isActive: false, items: [] };
  }

  const { data: itemsRows, error: itemsError } = await supabase
    .from("product_kit_items")
    .select(`
      id, quantity, component_product_id,
      products:component_product_id ( id, barcode, name, sale_price, tracks_inventory )
    `)
    .eq("kit_id", kitRow.id)
    .order("created_at", { ascending: true });

  if (itemsError) throw itemsError;

  return { isActive: kitRow.is_active !== false, items: itemsRows || [] };
};

export const fetchProductByBarcode = async (barcode) => {
  const { data, error } = await supabase
    .from("products")
    .select("id, barcode, name, cost_price, sale_price, is_kit, status, is_global, tracks_inventory, max_kits_per_sale")
    .eq("barcode", barcode)
    .eq("status", true)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const fetchProductInventory = async (productId, branchId) => {
  const { data, error } = await supabase
    .from("branch_inventory")
    .select("stock, is_active, has_been_stocked, cost_price, sale_price")
    .eq("branch_id", branchId)
    .eq("product_id", productId)
    .maybeSingle();

  if (error) throw error;
  return data;
};