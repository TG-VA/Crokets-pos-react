import { supabase } from "../../../../../lib/supabaseClient";

import { sortInventoryRows } from "../utils/inventoryReportUtils";

const POLI_BRANCH_ID =
  "412f367f-7c86-45ca-9e91-b8fe6274b232";

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

const buildBranchFallback = (currentBranch) => {
  if (!currentBranch?.id) {
    return [];
  }

  const branches = [
    {
      id: POLI_BRANCH_ID,
      name: "POLÍGONO",
      code: "",
    },
  ];

  if (currentBranch.id !== POLI_BRANCH_ID) {
    branches.push({
      id: currentBranch.id,
      name: currentBranch?.name || "Sucursal actual",
      code: currentBranch?.code || "",
    });
  }

  return branches;
};

const includePoligonoBranch = (branches) => {
  const branchesList = Array.isArray(branches) ? branches : [];

  const includesPoligono = branchesList.some(
    (item) => item?.id === POLI_BRANCH_ID
  );

  if (includesPoligono) {
    return branchesList;
  }

  return [
    ...branchesList,
    {
      id: POLI_BRANCH_ID,
      name: "POLÍGONO",
      code: "",
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
    const result = await supabase
      .from("branch_inventory")
      .select(selectClause)
      .eq("branch_id", branchId)
      .eq("is_active", true)
      .order("created_at", {
        ascending: false,
      });

    if (result.error) {
      lastError = result.error;
      continue;
    }

    inventoryRows = result.data ?? [];
    lastError = null;
    break;
  }

  if (lastError) {
    throw lastError;
  }

  return inventoryRows;
};

const fetchNoStockProducts = async () => {
  const { data, error } = await supabase
    .from("products")
    .select(NO_STOCK_PRODUCTS_SELECT)
    .eq("status", true)
    .eq("tracks_inventory", false)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

export const fetchBranchOptions = async (currentBranch) => {
  try {
    const { data, error } = await supabase
      .from("branches")
      .select("id, name, code")
      .order("name", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return includePoligonoBranch(data);
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
    mappedInventoryRows
      .map((item) => item.productId)
      .filter(Boolean)
  );

  const noStockProducts = await fetchNoStockProducts();

  const mappedNoStockProducts = noStockProducts
    .filter((product) => !inventoryProductIds.has(product.id))
    .map(mapNoStockProduct);

  return sortInventoryRows([
    ...mappedInventoryRows,
    ...mappedNoStockProducts,
  ]);
};