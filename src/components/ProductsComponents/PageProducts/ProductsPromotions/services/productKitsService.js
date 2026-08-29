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
  const now = new Date().toISOString();
  let createdProductId = null;
  let createdKitId = null;

  try {
    const { data: kitProduct, error: productError } = await supabase
      .from("products")
      .insert({
        barcode: kitData.barcode, name: kitData.description, sale_type: "unidad", department_id: null,
        unit: "pieza", cost_price: 0, sale_price: kitData.price, tax: 16, commission_enabled: false,
        commission_percent: 0, clave_sat: null, status: true, is_global: true, is_kit: true,
        tracks_inventory: false, created_at: now, updated_at: now, max_kits_per_sale: Number(kitData.max_kits_per_sale || 1),
      })
      .select("id")
      .single();

    if (productError) throw productError;
    createdProductId = kitProduct.id;

    const { data: kitRow, error: kitError } = await supabase
      .from("product_kits")
      .insert({ kit_product_id: createdProductId, is_active: true, created_at: now, updated_at: now })
      .select("id")
      .single();

    if (kitError) throw kitError;
    createdKitId = kitRow.id;

    const kitItemsPayload = selectedProducts.map((product) => ({
      kit_id: createdKitId, component_product_id: product.id, quantity: Number(product.quantity), created_at: now,
    }));

    const { error: itemsError } = await supabase.from("product_kit_items").insert(kitItemsPayload);
    if (itemsError) throw itemsError;

    return true;
  } catch (error) {
    try {
      if (createdKitId) await supabase.from("product_kits").delete().eq("id", createdKitId);
      if (createdProductId) await supabase.from("products").delete().eq("id", createdProductId);
    } catch (rollbackErr) {
      console.error("ALERTA CRÍTICA: Falló el rollback al crear un nuevo kit.", rollbackErr);
    }
    throw error;
  }
};

export const updateKitTransaction = async (editingKit, kitData, selectedProducts) => {
  const now = new Date().toISOString();
  let oldItems = [];

  try {
    const { data: existingItems } = await supabase
      .from("product_kit_items")
      .select("*")
      .eq("kit_id", editingKit.id);
    
    if (existingItems) oldItems = existingItems;

    const { error: productError } = await supabase
      .from("products")
      .update({ barcode: kitData.barcode, name: kitData.description, sale_price: kitData.price, max_kits_per_sale: Number(kitData.max_kits_per_sale || 1), updated_at: now })
      .eq("id", editingKit.kit_product_id);

    if (productError) throw productError;

    const { error: kitError } = await supabase
      .from("product_kits")
      .update({ updated_at: now })
      .eq("id", editingKit.id);

    if (kitError) throw kitError;

    const { error: deleteItemsError } = await supabase
      .from("product_kit_items")
      .delete()
      .eq("kit_id", editingKit.id);

    if (deleteItemsError) throw deleteItemsError;

    const kitItemsPayload = selectedProducts.map((product) => ({
      kit_id: editingKit.id, component_product_id: product.id, quantity: Number(product.quantity), created_at: now,
    }));

    const { error: itemsError } = await supabase.from("product_kit_items").insert(kitItemsPayload);
    if (itemsError) throw itemsError;

    return true;
  } catch (error) {
    if (oldItems.length > 0) {
      try {
        await supabase.from("product_kit_items").delete().eq("kit_id", editingKit.id);
        await supabase.from("product_kit_items").insert(oldItems);
      } catch (rollbackErr) {
        console.error("ALERTA CRÍTICA: Falló el rollback al restaurar items previos del kit.", rollbackErr);
      }
    }
    throw error;
  }
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
  const now = new Date().toISOString();
  let productDeactivated = false;

  try {
    const { error: productError } = await supabase.from("products").update({ status: false, updated_at: now }).eq("id", kitProductId);
    if (productError) throw productError;
    productDeactivated = true;

    const { error: kitError } = await supabase.from("product_kits").update({ is_active: false, updated_at: now }).eq("id", kitId);
    if (kitError) throw kitError;

    return true;
  } catch (error) {
    if (productDeactivated) {
      try {
        await supabase.from("products").update({ status: true }).eq("id", kitProductId);
      } catch (rollbackErr) {
        console.error("ALERTA CRÍTICA: Falló el rollback al revertir estado del producto tras fallar eliminación suave del kit.", rollbackErr);
      }
    }
    throw error;
  }
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