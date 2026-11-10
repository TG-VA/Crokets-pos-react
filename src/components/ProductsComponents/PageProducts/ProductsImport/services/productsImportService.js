import { supabase } from "../../../../../lib/supabaseClient";
import { validateSatClaves } from "../../../../../services/satClavesService";

export const fetchValidationData = async (barcodes, satCodes) => {
  let existingProducts = [];
  if (barcodes.length > 0) {
    const { data, error } = await supabase
      .from("products")
      .select("id, barcode")
      .in("barcode", barcodes);
    if (error) throw error;
    existingProducts = data || [];
  }

  const { data: departments, error: depError } = await supabase
    .from("departments")
    .select("id, name, status");
  if (depError) throw depError;

  const existingSatCodes = await validateSatClaves(satCodes);

  return { existingProducts, departments, existingSatCodes };
};

export const fetchDepartments = async () => {
  const { data: departments, error: depError } = await supabase
    .from("departments")
    .select("id, name, status");
  if (depError) throw depError;

  return departments || [];
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

export const processImportTransaction = async (
  validRows,
  branchId,
  departmentMap
) => {
  if (validRows.length === 0)
    return { createdProductsCount: 0, createdInventoriesCount: 0 };

  const p_rows = validRows.map((item) => ({
    product: {
      ...item.product,
      department_id: item.department_name
        ? departmentMap[item.department_name.toLowerCase()] || null
        : null,
    },
    inventory: item.inventory,
  }));

  const { data, error } = await supabase.rpc("import_products_transaction", {
    p_rows,
    p_branch_id: branchId,
    p_all_branches: [],
  });

  if (error) throw error;

  return {
    createdProductsCount: data.created_products_count,
    createdInventoriesCount: data.created_inventories_count,
  };
};
