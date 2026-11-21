import { supabase } from "../../lib/supabaseClient";

import {
  buildDepartmentMap,
  buildInventoryProductIds,
  formatBranchKardexProducts,
  formatGlobalProductsWithoutInventory,
} from "./productFormatters";
import { fetchAllPages } from "../supabase/paginatedQuery";
import { sortRowsBy } from "../supabase/sortRows";

// Las paginas llegan ordenadas por id; el catalogo conserva el orden de alta.
const sortByCreatedAt = (rows) =>
  sortRowsBy(rows, "created_at", { type: "date" });

export const fetchDepartments = async () => {
  try {
    const { data, error } = await supabase
      .from("departments")
      .select(
        "id, name, status, commission_enabled, commission_type, commission_value, created_at, updated_at"
      )
      .order("name", { ascending: true });

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      error: null,
      partial: false,
    };
  } catch (error) {
    console.error("Error cargando departamentos:", error);

    return {
      success: false,
      data: [],
      error: error.message || "Error al cargar departamentos.",
      partial: false,
    };
  }
};

/**
 * Consulta paginada en el servidor de los productos de una sucursal.
 * Replica el mismo conjunto que fetchBranchCatalog, delegando el filtrado,
 * el conteo y el ordenado al RPC get_branch_products_paginated.
 */
export const fetchPaginatedBranchProducts = async ({
  branchId,
  searchTerm,
  departmentId,
  page = 1,
  pageSize = 10,
}) => {
  try {
    const { data, error } = await supabase.rpc(
      "get_branch_products_paginated",
      {
        p_branch_id: branchId,
        p_search: searchTerm?.trim() || null,
        p_department_id: departmentId || null,
        p_page: page,
        p_page_size: pageSize,
      }
    );

    if (error) throw error;

    const rows = data || [];

    return {
      success: true,
      data: {
        products: rows,
        totalCount: Number(rows[0]?.total_count || 0),
      },
      error: null,
      partial: false,
    };
  } catch (error) {
    console.error("Error consultando productos paginados:", error);

    return {
      success: false,
      data: { products: [], totalCount: 0 },
      error: error.message || "Error al consultar productos paginados.",
      partial: false,
    };
  }
};

const PRODUCT_SELECT_FIELDS = `
  id,
  barcode,
  name,
  department_id,
  status,
  is_global,
  is_kit,
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
  try {
    const { data: departmentsData, error: departmentsFetchError } =
      await fetchAllPages(() =>
        supabase.from("departments").select("id, name")
      );

    if (departmentsFetchError) throw departmentsFetchError;

    const departmentsMap = buildDepartmentMap(departmentsData);

    const { data: inventoryPages, error: inventoryError } = await fetchAllPages(
      () =>
        supabase
          .from("branch_inventory")
          .select(
            `
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
    `
          )
          .eq("branch_id", branchId)
    );

    if (inventoryError) throw inventoryError;

    const inventoryRows = sortByCreatedAt(inventoryPages);

    const { data: globalPages, error: globalProductsError } =
      await fetchAllPages(() =>
        supabase
          .from("products")
          .select(PRODUCT_SELECT_FIELDS)
          .eq("is_global", true)
          .eq("status", true)
      );

    if (globalProductsError) throw globalProductsError;

    const globalProducts = sortByCreatedAt(globalPages);

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
      success: true,
      data: {
        kardexProducts: formattedBranchKardexProducts,
        products: [
          ...formattedInventoryProducts,
          ...formattedGlobalProductsWithoutInventory,
        ],
      },
      error: null,
      partial: false,
    };
  } catch (error) {
    console.error("Error cargando catálogo de productos:", error);

    return {
      success: false,
      data: { kardexProducts: [], products: [] },
      error: error.message || "Error al cargar catálogo de productos.",
      partial: false,
    };
  }
};
