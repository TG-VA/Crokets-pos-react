import { supabase } from "../../../../../lib/supabaseClient";
import {
  fetchOperationalBranches,
  isOperationalBranch,
} from "../../../../../services/branchScopeService";

import { sortInventoryRows } from "../utils/inventoryReportUtils";

// PostgREST trunca cada respuesta en 1000 filas sin devolver error. Las
// consultas del reporte se leen por paginas de ese tamano y se detienen en un
// tope explicito, el mismo criterio que el catalogo de ProductsContext.
export const INVENTORY_REPORT_PAGE_SIZE = 1000;
export const MAX_INVENTORY_REPORT_ROWS = 10000;

const fetchAllPages = async (buildQuery) => {
  const rows = [];

  for (
    let from = 0;
    from < MAX_INVENTORY_REPORT_ROWS;
    from += INVENTORY_REPORT_PAGE_SIZE
  ) {
    const to =
      Math.min(from + INVENTORY_REPORT_PAGE_SIZE, MAX_INVENTORY_REPORT_ROWS) -
      1;
    const { data, error } = await buildQuery().range(from, to);

    if (error) {
      throw error;
    }

    const page = Array.isArray(data) ? data : [];
    rows.push(...page);

    if (page.length < to - from + 1) {
      break;
    }
  }

  return rows;
};

const INVENTORY_SELECT_CANDIDATES = [
  `
    id,
    branch_id,
    product_id,
    stock,
    min_stock,
    max_stock,
    is_active,
    products:product_id(
      id,
      barcode,
      name,
      department_id,
      is_global,
      status,
      tracks_inventory,
      departments(
        name
      )
    )
  `,
  `
    id,
    branch_id,
    product_id,
    stock,
    min_stock,
    max_stock,
    is_active,
    products(
      id,
      barcode,
      name,
      department_id,
      is_global,
      status,
      tracks_inventory,
      departments(
        name
      )
    )
  `,
];

const NO_STOCK_PRODUCTS_SELECT = `
  id,
  barcode,
  name,
  department_id,
  is_global,
  status,
  tracks_inventory,
  departments(
    name
  )
`;

// Ante un error al listar sucursales solo se ofrece la sucursal actual, y solo
// si es operativa: el selector nunca muestra sucursales que el catalogo no
// confirmo como operativas.
const buildBranchFallback = (currentBranch) => {
  if (!currentBranch?.id || !isOperationalBranch(currentBranch)) {
    return [];
  }

  return [
    {
      id: currentBranch.id,
      name: currentBranch.name || "Sucursal actual",
      code: currentBranch.code || "",
    },
  ];
};

const getDepartmentName = (product) => {
  const departments = product?.departments;

  if (Array.isArray(departments)) {
    return String(departments[0]?.name ?? "");
  }

  return String(departments?.name ?? "");
};

const mapInventoryRow = (item) => {
  const product = item?.products ?? {};

  return {
    inventoryRowId: item?.id ?? null,
    productId: item?.product_id ?? product?.id ?? null,
    codigo: String(product?.barcode ?? ""),
    nombre: String(product?.name ?? ""),
    depto: getDepartmentName(product),
    existencia: Number(item?.stock ?? 0) || 0,
    min: Number(item?.min_stock ?? 0) || 0,
    max: Number(item?.max_stock ?? 0) || 0,
    tracksInventory: product?.tracks_inventory !== false,
    noStockProduct: false,
  };
};

const mapNoStockProduct = (product) => ({
  inventoryRowId: null,
  productId: product?.id ?? null,
  codigo: String(product?.barcode ?? ""),
  nombre: String(product?.name ?? ""),
  depto: getDepartmentName(product),
  existencia: null,
  min: null,
  max: null,
  tracksInventory: false,
  noStockProduct: true,
});

const fetchInventoryRowsByBranch = async (branchId) => {
  let inventoryRows = [];
  let lastError = null;

  for (const selectClause of INVENTORY_SELECT_CANDIDATES) {
    try {
      inventoryRows = await fetchAllPages(() =>
        supabase
          .from("branch_inventory")
          .select(selectClause)
          .eq("branch_id", branchId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
      );
    } catch (queryError) {
      lastError = queryError;
      continue;
    }

    lastError = null;
    break;
  }

  if (lastError) {
    throw lastError;
  }

  return inventoryRows;
};

const fetchNoStockProducts = () =>
  fetchAllPages(() =>
    supabase
      .from("products")
      .select(NO_STOCK_PRODUCTS_SELECT)
      .eq("status", true)
      .eq("tracks_inventory", false)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
  );

export const fetchBranchOptions = async (currentBranch) => {
  try {
    const { data, error } = await fetchOperationalBranches();

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    error.branchFallback = buildBranchFallback(currentBranch);
    throw error;
  }
};

export const getBranchOptionsFallback = (currentBranch) => {
  return buildBranchFallback(currentBranch);
};

export const fetchInventoryReportRows = async (branchId) => {
  if (!branchId) {
    return [];
  }

  const inventoryRows = await fetchInventoryRowsByBranch(branchId);

  const activeInventoryRows = inventoryRows.filter((item) => {
    const product = item?.products;

    if (!product?.id) {
      return false;
    }

    return product.status === true;
  });

  const mappedInventoryRows = activeInventoryRows.map(mapInventoryRow);

  const inventoryProductIds = new Set(
    mappedInventoryRows.map((item) => item.productId).filter(Boolean)
  );

  const noStockProducts = await fetchNoStockProducts();

  const mappedNoStockProducts = noStockProducts
    .filter((product) => !inventoryProductIds.has(product.id))
    .map(mapNoStockProduct);

  return sortInventoryRows([...mappedInventoryRows, ...mappedNoStockProducts]);
};
