import { supabase } from "../../lib/supabaseClient";

import {
  buildDepartmentMap,
  buildInventoryProductIds,
  formatBranchKardexProducts,
  formatGlobalProductsWithoutInventory,
} from "./productFormatters";

const MAX_CATALOG_ROWS_TO_LOAD = 10000;

export const fetchDepartments = async () => {
  const { data, error } = await supabase
    .from("departments")
    .select(
      "id, name, status, commission_enabled, commission_type, commission_value, created_at, updated_at"
    )
    .order("name", { ascending: true });

  if (error) throw error;

  return data || [];
};

const PRODUCT_SELECT_FIELDS = `
  id,
  barcode,
  name,
  department_id,
  status,
  is_global,
  sale_type,
  unit,
  tax,
  cost_price,
  sale_price,
  profit,
  commission_enabled,
  commission_percent,
  commission_type,
  commission_value,
  clave_sat,
  tracks_inventory,
  created_at,
  updated_at
`;

export const fetchBranchCatalog = async (branchId) => {
  const { data: departmentsData, error: departmentsFetchError } = await supabase
    .from("departments")
    .select("id, name")
    .limit(MAX_CATALOG_ROWS_TO_LOAD);

  if (departmentsFetchError) throw departmentsFetchError;

  const departmentsMap = buildDepartmentMap(departmentsData);

  const { data: inventoryRows, error: inventoryError } = await supabase
    .from("branch_inventory")
    .select(`
      id,
      branch_id,
      product_id,
      stock,
      min_stock,
      max_stock,
      is_active,
      has_been_stocked,
      cost_price,
      sale_price,
      created_at,
      updated_at,
      products (
        ${PRODUCT_SELECT_FIELDS}
      )
    `)
    .eq("branch_id", branchId)
    .order("created_at", { ascending: true })
    .limit(MAX_CATALOG_ROWS_TO_LOAD);

  if (inventoryError) throw inventoryError;

  const { data: globalProducts, error: globalProductsError } = await supabase
    .from("products")
    .select(PRODUCT_SELECT_FIELDS)
    .eq("is_global", true)
    .eq("status", true)
    .order("created_at", { ascending: true })
    .limit(MAX_CATALOG_ROWS_TO_LOAD);

  if (globalProductsError) throw globalProductsError;

  const formattedBranchKardexProducts = formatBranchKardexProducts(
    inventoryRows,
    departmentsMap
  );

  const inventoryProductIds = buildInventoryProductIds(inventoryRows);

  const formattedInventoryProducts = formattedBranchKardexProducts.filter(
    (product) => product.status === true
  );

  const formattedGlobalProductsWithoutInventory =
    formatGlobalProductsWithoutInventory(
      globalProducts,
      inventoryProductIds,
      departmentsMap,
      branchId
    );

  return {
    kardexProducts: formattedBranchKardexProducts,
    products: [
      ...formattedInventoryProducts,
      ...formattedGlobalProductsWithoutInventory,
    ],
  };
};