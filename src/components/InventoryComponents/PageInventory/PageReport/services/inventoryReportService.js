import { supabase } from "../../../../../lib/supabaseClient";
import {
  fetchOperationalBranches,
  isOperationalBranch,
} from "../../../../../services/branchScopeService";

import { sortInventoryRows } from "./inventoryReportCalculationService";

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

const INVENTORY_SELECT = `
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
`;

const PRODUCTS_SELECT = `
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
    departmentId: product?.department_id ?? null,
    existencia: Number(item?.stock ?? 0) || 0,
    min: Number(item?.min_stock ?? 0) || 0,
    max: Number(item?.max_stock ?? 0) || 0,
    tracksInventory: product?.tracks_inventory !== false,
    noStockProduct: false,
    noBranchRecord: false,
  };
};

const mapNoStockProduct = (product) => ({
  inventoryRowId: null,
  productId: product?.id ?? null,
  codigo: String(product?.barcode ?? ""),
  nombre: String(product?.name ?? ""),
  depto: getDepartmentName(product),
  departmentId: product?.department_id ?? null,
  existencia: null,
  min: null,
  max: null,
  tracksInventory: false,
  noStockProduct: true,
  noBranchRecord: false,
});

// Producto con control de inventario que no tiene fila activa en la sucursal:
// sus valores quedan en null para no confundirlo con un agotado.
const mapNoBranchRecordProduct = (product) => ({
  inventoryRowId: null,
  productId: product?.id ?? null,
  codigo: String(product?.barcode ?? ""),
  nombre: String(product?.name ?? ""),
  depto: getDepartmentName(product),
  departmentId: product?.department_id ?? null,
  existencia: null,
  min: null,
  max: null,
  tracksInventory: true,
  noStockProduct: false,
  noBranchRecord: true,
});

const fetchInventoryRowsByBranch = (branchId) =>
  fetchAllPages(() =>
    supabase
      .from("branch_inventory")
      .select(INVENTORY_SELECT)
      .eq("branch_id", branchId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
  );

const fetchActiveProductsByTracking = (tracksInventory) =>
  fetchAllPages(() =>
    supabase
      .from("products")
      .select(PRODUCTS_SELECT)
      .eq("status", true)
      .eq("tracks_inventory", tracksInventory)
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

  // Un producto solo puede aparecer una vez: la fila de inventario manda y
  // luego cada consulta de productos agrega unicamente los que faltan.
  const seenProductIds = new Set(
    mappedInventoryRows.map((item) => item.productId).filter(Boolean)
  );

  const takeUnseen = (products, mapProduct) =>
    products
      .filter((product) => {
        if (!product?.id || seenProductIds.has(product.id)) {
          return false;
        }

        seenProductIds.add(product.id);
        return true;
      })
      .map(mapProduct);

  const [trackedProducts, noStockProducts] = await Promise.all([
    fetchActiveProductsByTracking(true),
    fetchActiveProductsByTracking(false),
  ]);

  const mappedNoBranchRecordProducts = takeUnseen(
    trackedProducts,
    mapNoBranchRecordProduct
  );
  const mappedNoStockProducts = takeUnseen(noStockProducts, mapNoStockProduct);

  return sortInventoryRows([
    ...mappedInventoryRows,
    ...mappedNoBranchRecordProducts,
    ...mappedNoStockProducts,
  ]);
};
