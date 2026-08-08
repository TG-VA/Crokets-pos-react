import { supabase } from "../../../lib/supabaseClient";

export const toNumber = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
};

export const formatCurrency = (value) => `$${toNumber(value).toFixed(2)}`;

export const getRewardDiscountLabel = (reward) => {
  const type = reward?.discount_type;
  const val = toNumber(reward?.discount_value);
  if (type === "percent") return `${val}% de descuento`;
  if (type === "fixed") return `${formatCurrency(val)} de descuento`;
  return "Descuento de recompensa";
};

export const productUsesInventory = (product) => product?.tracks_inventory !== false;

export const getProductSalePrice = (product, inventoryByProduct = {}) => {
  const row = inventoryByProduct[product?.id];
  if (row && row.sale_price !== null && row.sale_price !== undefined) {
    return toNumber(row.sale_price);
  }
  return toNumber(product?.sale_price);
};

export const calculateRewardDiscount = (product, reward, inventoryByProduct = {}) => {
  const price = getProductSalePrice(product, inventoryByProduct);
  const type = reward?.discount_type;
  const val = toNumber(reward?.discount_value);
  let rawDiscount = 0;

  if (type === "percent") rawDiscount = price * (val / 100);
  if (type === "fixed") rawDiscount = val;

  const discountAmount = Math.min(Math.floor(rawDiscount), price);
  return { price, discountAmount, finalPrice: Math.max(price - discountAmount, 0) };
};

export const fetchProductsAndInventory = async (branchId) => {
  const { data: prods, error: pErr } = await supabase
    .from("products")
    .select("id, barcode, name, sale_price, cost_price, status, tracks_inventory, is_kit")
    .order("name");
  
  if (pErr) throw pErr;

  const cleanProds = (prods || []).filter(p => p?.id && p?.status !== false);
  const idsToTrack = cleanProds.filter(productUsesInventory).map(p => p.id);

  if (!branchId || !idsToTrack.length) {
    return { cleanProds, inventoryMap: {} };
  }

  const { data: inv, error: iErr } = await supabase
    .from("branch_inventory")
    .select("product_id, stock, is_active, has_been_stocked, sale_price, cost_price")
    .eq("branch_id", branchId)
    .in("product_id", idsToTrack);
  
  if (iErr) throw iErr;

  const inventoryMap = (inv || []).reduce((acc, row) => ({ ...acc, [row.product_id]: row }), {});
  
  return { cleanProds, inventoryMap };
};