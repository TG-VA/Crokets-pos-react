export const buildDepartmentMap = (departmentsData) =>
  new Map((departmentsData || []).map((dept) => [dept.id, dept.name]));

export const buildInventoryProductIds = (inventoryRows) =>
  new Set(
    (inventoryRows || [])
      .filter((row) => row.products?.status === true)
      .map((row) => row.product_id)
  );

export const formatBranchKardexProducts = (inventoryRows, departmentsMap) =>
  (inventoryRows || [])
    .filter((row) => Boolean(row.products))
    .map((row) => ({
      id: row.products.id,
      inventory_id: row.id,
      product_id: row.product_id,
      branch_id: row.branch_id,
      codigo: row.products.barcode || "",
      descripcion: (row.products.name || "").toUpperCase(),
      departamento:
        departmentsMap.get(row.products.department_id) || "Sin departamento",
      costo: Number(row.cost_price ?? row.products.cost_price ?? 0),
      precio: Number(row.sale_price ?? row.products.sale_price ?? 0),
      ganancia: Number(row.products.profit ?? 0),
      existencia: Number(row.stock || 0),
      minimo: Number(row.min_stock || 0),
      maximo: Number(row.max_stock || 0),
      status: !!row.products.status,
      is_active: row.is_active ?? true,
      is_kardex_inactive:
        row.products.status !== true || row.is_active !== true,
      has_been_stocked: !!row.has_been_stocked,
      is_global: !!row.products.is_global,
      sale_type: row.products.sale_type || "unidad",
      unit: row.products.unit || "pieza",
      tax: Number(row.products.tax ?? 0),
      commission_enabled: !!row.products.commission_enabled,
      commission_percent: Number(row.products.commission_percent ?? 0),
      commission_type: row.products.commission_type || "percent",
      commission_value: Number(row.products.commission_value ?? 0),
      cfdi: row.products.clave_sat || "",
      tracks_inventory: !!row.products.tracks_inventory,
      created_at: row.created_at || row.products.created_at,
      updated_at: row.updated_at || row.products.updated_at || null,
      use_inventory: !!row.products.tracks_inventory,
    }));

export const formatGlobalProductsWithoutInventory = (
  globalProducts,
  inventoryProductIds,
  departmentsMap,
  branchId
) =>
  (globalProducts || [])
    .filter((product) => !inventoryProductIds.has(product.id))
    .map((product) => ({
      id: product.id,
      inventory_id: null,
      product_id: product.id,
      branch_id: branchId,
      codigo: product.barcode || "",
      descripcion: (product.name || "").toUpperCase(),
      departamento:
        departmentsMap.get(product.department_id) || "Sin departamento",
      costo: Number(product.cost_price ?? 0),
      precio: Number(product.sale_price ?? 0),
      ganancia: Number(product.profit ?? 0),
      existencia: 0,
      minimo: 0,
      maximo: 0,
      status: !!product.status,
      is_active: false,
      has_been_stocked: false,
      is_global: !!product.is_global,
      sale_type: product.sale_type || "unidad",
      unit: product.unit || "pieza",
      tax: Number(product.tax ?? 0),
      commission_enabled: !!product.commission_enabled,
      commission_percent: Number(product.commission_percent ?? 0),
      commission_type: product.commission_type || "percent",
      commission_value: Number(product.commission_value ?? 0),
      cfdi: product.clave_sat || "",
      tracks_inventory: !!product.tracks_inventory,
      created_at: product.created_at || null,
      updated_at: product.updated_at || null,
      use_inventory: !!product.tracks_inventory,
    }));