import { supabase } from "../../../../../lib/supabaseClient";
import { validateSatClaves } from "../../../../../services/satClavesService";

export const fetchValidationData = async (barcodes, satCodes) => {
  let existingProducts = [];
  if (barcodes.length > 0) {
    const { data, error } = await supabase.from("products").select("id, barcode").in("barcode", barcodes);
    if (error) throw error;
    existingProducts = data || [];
  }

  const { data: departments, error: depError } = await supabase.from("departments").select("id, name");
  if (depError) throw depError;

  const existingSatCodes = await validateSatClaves(satCodes);

  return { existingProducts, departments, existingSatCodes };
};

export const fetchBranchesAndDepartments = async () => {
  const { data: branches, error: brError } = await supabase.from("branches").select("id");
  if (brError) throw brError;

  const { data: departments, error: depError } = await supabase.from("departments").select("id, name");
  if (depError) throw depError;

  return { branches, departments };
};

export const createMissingDepartments = async (departmentNames) => {
  if (departmentNames.length === 0) return [];
  const { data, error } = await supabase
    .from("departments")
    .insert(departmentNames.map((name) => ({ name })))
    .select("id, name");

  if (error) throw error;
  return data || [];
};

export const processImportTransaction = async (validRows, branchId, allBranches, departmentMap) => {
  if (validRows.length === 0) return { createdProductsCount: 0, createdInventoriesCount: 0 };

  const productsToInsert = validRows.map((item) => ({
    ...item.product,
    department_id: item.department_name ? departmentMap[item.department_name.toLowerCase()] || null : null,
  }));

  const { data: insertedProducts, error: productsError } = await supabase
    .from("products")
    .insert(productsToInsert)
    .select("id, barcode, is_global, tracks_inventory");

  if (productsError) throw productsError;

  const insertedProductMap = {};
  insertedProducts.forEach((p) => {
    insertedProductMap[p.barcode] = p;
  });

  const inventoryRowsToInsert = [];

  validRows.forEach((item) => {
    const product = insertedProductMap[item.product.barcode];
    
    if (product && product.tracks_inventory) {
      const targetBranchIds = product.is_global ? (allBranches || []).map((b) => b.id) : [branchId];
      
      targetBranchIds.forEach((bId) => {
        const isCurrentBranch = bId === branchId;
        inventoryRowsToInsert.push({
          branch_id: bId,
          product_id: product.id,
          stock: isCurrentBranch ? item.inventory.stock : 0,
          min_stock: isCurrentBranch ? item.inventory.min_stock : 0,
          max_stock: isCurrentBranch ? item.inventory.max_stock : 0,
          is_active: true,
          has_been_stocked: isCurrentBranch ? item.inventory.has_been_stocked : false,
          cost_price: item.product.cost_price,
          sale_price: item.product.sale_price,
        });
      });
    }
  });

  if (inventoryRowsToInsert.length > 0) {
    const { error: invError } = await supabase
      .from("branch_inventory")
      .insert(inventoryRowsToInsert);
      
    if (invError) {
      try {
        const insertedIds = insertedProducts.map((p) => p.id);
        const { error: rollbackError } = await supabase.from("products").delete().in("id", insertedIds);
        
        if (rollbackError) throw rollbackError;
      } catch (rollbackErr) {
        console.error("ALERTA CRÍTICA: Fallo el rollback de productos huerfanos tras un error en inventario.", rollbackErr);
      }
      
      throw invError;
    }
  }

  return { 
    createdProductsCount: insertedProducts.length, 
    createdInventoriesCount: inventoryRowsToInsert.length 
  };
};