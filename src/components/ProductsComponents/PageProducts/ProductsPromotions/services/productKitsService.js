import { supabase } from "../../../../../lib/supabaseClient";

export const fetchKits = async () => {
  const { data, error } = await supabase
    .from("product_kits")
    .select(`
      id, kit_product_id, is_active, created_at, updated_at,
      products:product_kits_kit_product_id_fkey (id, barcode, name, sale_price, status, is_global, max_kits_per_sale)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).filter((kit) => kit.products?.status === true);
};

export const checkKitDuplicates = async (cleanBarcode, cleanDescription, currentProductId = null) => {
  const { data: duplicatedBarcode, error: barcodeError } = await supabase
    .from("products")
    .select("id")
    .eq("barcode", cleanBarcode)
    .maybeSingle();

  if (barcodeError) throw barcodeError;
  if (duplicatedBarcode && duplicatedBarcode.id !== currentProductId) {
    return { isDuplicate: true, reason: "barcode" };
  }

  const { data: duplicatedName, error: nameError } = await supabase
    .from("products")
    .select("id")
    .eq("name", cleanDescription)
    .eq("is_kit", true)
    .maybeSingle();

  if (nameError) throw nameError;
  if (duplicatedName && duplicatedName.id !== currentProductId) {
    return { isDuplicate: true, reason: "name" };
  }

  return { isDuplicate: false };
};

export const createNewKitTransaction = async (kitData, selectedProducts) => {
  const { error } = await supabase.rpc("create_kit_transaction", {
    p_kit_product: {
      barcode: kitData.barcode,
      name: kitData.description,
      sale_price: kitData.price,
      max_kits_per_sale: Number(kitData.max_kits_per_sale || 1),
    },
    p_kit_items: selectedProducts.map((product) => ({
      component_product_id: product.id,
      quantity: Number(product.quantity),
    })),
  });

  if (error) throw error;
  return true;
};

export const updateKitTransaction = async (editingKit, kitData, selectedProducts) => {
  const { error } = await supabase.rpc("update_kit_transaction", {
    p_kit_id: editingKit.id,
    p_kit_product_id: editingKit.kit_product_id,
    p_kit_product: {
      barcode: kitData.barcode,
      name: kitData.description,
      sale_price: kitData.price,
      max_kits_per_sale: Number(kitData.max_kits_per_sale || 1),
    },
    p_kit_items: selectedProducts.map((product) => ({
      component_product_id: product.id,
      quantity: Number(product.quantity),
    })),
  });

  if (error) throw error;
  return true;
};

export const fetchKitItems = async (kitId) => {
  const { data, error } = await supabase
    .from("product_kit_items")
    .select(`id, kit_id, component_product_id, quantity, products:component_product_id (id, barcode, name, sale_price, cost_price, is_kit)`)
    .eq("kit_id", kitId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
};

export const toggleKitStatus = async (kitId, nextStatus) => {
  const now = new Date().toISOString();
  const { error } = await supabase.from("product_kits").update({ is_active: nextStatus, updated_at: now }).eq("id", kitId);
  if (error) throw error;
  return true;
};

export const softDeleteKitTransaction = async (kitId, kitProductId) => {
  const { error } = await supabase.rpc("delete_kit_transaction", {
    p_kit_id: kitId,
    p_kit_product_id: kitProductId,
  });

  if (error) throw error;
  return true;
};

export const fetchActiveNonKitProducts = async () => {
  const { data, error } = await supabase
    .from("products")
    .select(`id, barcode, name, cost_price, sale_price, status, is_kit, tracks_inventory`)
    .eq("status", true)
    .eq("is_kit", false)
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
};
