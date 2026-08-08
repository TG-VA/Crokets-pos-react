import { supabase } from "../../../lib/supabaseClient";

export const normalizeText = (text) => String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
export const escapeSearchTerm = (term) => String(term || "").trim().replace(/[%_]/g, "").replace(/,/g, " ");

const getProductWeightInKg = (name) => {
  const match = name.match(/(\d+(?:[.,]\d+)?)\s*(kg|kgs|kilo|kilos|g|gr|gramo|gramos)\b/i);
  if (!match) return Number.POSITIVE_INFINITY;
  const value = Number(String(match[1]).replace(",", "."));
  const unit = String(match[2] || "").toLowerCase();
  if (Number.isNaN(value)) return Number.POSITIVE_INFINITY;
  return ["g", "gr", "gramo", "gramos"].includes(unit) ? value / 1000 : value;
};

const getProductBaseName = (name, sortableName) => sortableName
  .replace(/\b\d+(?:[.,]\d+)?\s*(kg|kgs|kilo|kilos|g|gr|gramo|gramos)\b/gi, "")
  .replace(/\bkit\b/gi, "").replace(/[()+\-_/]/g, " ").replace(/\s+/g, " ").trim();

export const sortProductsByNameAndWeight = (productsList = []) => {
  return [...productsList].sort((a, b) => {
    const nameA = String(a?.name || "").trim();
    const nameB = String(b?.name || "").trim();
    const sortableA = normalizeText(nameA).replace(/\s+/g, " ");
    const sortableB = normalizeText(nameB).replace(/\s+/g, " ");
    
    const baseNameA = getProductBaseName(nameA, sortableA);
    const baseNameB = getProductBaseName(nameB, sortableB);
    const baseNameCompare = baseNameA.localeCompare(baseNameB, "es", { sensitivity: "base", numeric: true });
    
    if (baseNameCompare !== 0) return baseNameCompare;
    
    const weightA = getProductWeightInKg(nameA);
    const weightB = getProductWeightInKg(nameB);
    if (weightA !== weightB) return weightA - weightB;
    
    const fullNameCompare = sortableA.localeCompare(sortableB, "es", { sensitivity: "base", numeric: true });
    if (fullNameCompare !== 0) return fullNameCompare;
    
    return String(a?.barcode || "").localeCompare(String(b?.barcode || ""), "es", { sensitivity: "base", numeric: true });
  });
};

export const fetchDiscountsMap = async (productIds = []) => {
  if (!productIds.length) return {};
  const { data, error } = await supabase.from("product_discounts").select("product_id, enabled, discount_percent, discount_concept").in("product_id", productIds);
  if (error) throw error;
  return (data || []).reduce((acc, row) => ({ ...acc, [row.product_id]: { discount_enabled: !!row.enabled, discount_percent: Number(row.discount_percent || 0), discount_concept: row.discount_concept || "" } }), {});
};

export const fetchProductSearch = async (searchTerm, branchId) => {
  const safeTerm = escapeSearchTerm(searchTerm);
  const likeTerm = `%${safeTerm}%`;

  const { data: matchedProducts, error: productsError } = await supabase
    .from("products")
    .select("id, barcode, name, sale_price, cost_price, status, is_kit, is_global, tracks_inventory")
    .eq("status", true)
    .or(`name.ilike.${likeTerm},barcode.ilike.${likeTerm}`)
    .limit(80);

  if (productsError) throw productsError;
  if (!matchedProducts?.length) return { matchedProducts: [], inventoryMap: {}, discountsMap: {} };

  const productIds = matchedProducts.map((p) => p.id);
  const [invRes, discountsMap] = await Promise.all([
    supabase.from("branch_inventory").select("id, branch_id, product_id, stock, is_active, has_been_stocked, cost_price, sale_price, updated_at").eq("branch_id", branchId).in("product_id", productIds),
    fetchDiscountsMap(productIds)
  ]);

  if (invRes.error) throw invRes.error;
  const inventoryMap = (invRes.data || []).reduce((acc, row) => ({ ...acc, [row.product_id]: row }), {});

  return { matchedProducts, inventoryMap, discountsMap };
};

export const fetchKitData = async (kitProductId, branchId) => {
  const { data: kitRow, error: kitError } = await supabase.from("product_kits").select("id, is_active").eq("kit_product_id", kitProductId).maybeSingle();
  if (kitError) throw kitError;
  if (!kitRow?.id || kitRow.is_active === false) return { kitRow };

  const { data: kitItems, error: itemsError } = await supabase.from("product_kit_items").select("id, component_product_id, quantity, products:component_product_id(id, barcode, name, tracks_inventory)").eq("kit_id", kitRow.id).order("created_at");
  if (itemsError) throw itemsError;

  const componentIds = (kitItems || []).map(i => i.component_product_id).filter(Boolean);
  const { data: invRows, error: invError } = await supabase.from("branch_inventory").select("product_id, stock, is_active, has_been_stocked").eq("branch_id", branchId).in("product_id", componentIds);
  if (invError) throw invError;

  const inventoryMap = (invRows || []).reduce((acc, row) => ({ ...acc, [row.product_id]: row }), {});
  return { kitRow, kitItems: kitItems || [], inventoryMap };
};

export const fetchProductStocksAcrossBranches = async (productId) => {
  const { data: stockRows, error: stockError } = await supabase.from("branch_inventory").select("branch_id, stock, is_active, has_been_stocked, sale_price").eq("product_id", productId);
  if (stockError) throw stockError;
  
  const validRows = (stockRows || []).filter(r => r.is_active !== false && r.has_been_stocked === true);
  const branchIds = [...new Set(validRows.map(r => r.branch_id).filter(Boolean))];
  
  if (!branchIds.length) return { validRows: [], branchMap: {} };

  const { data: branches, error: branchError } = await supabase.from("branches").select("id, code, name").in("id", branchIds);
  if (branchError) throw branchError;

  return { validRows, branchMap: (branches || []).reduce((acc, b) => ({ ...acc, [b.id]: b }), {}) };
};