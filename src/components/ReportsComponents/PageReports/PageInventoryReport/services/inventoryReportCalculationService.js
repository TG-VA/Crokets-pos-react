/**
 * inventoryReportCalculationService.js
 * Funciones puras de transformacion y agregacion del Reporte de Inventario.
 * Sin I/O ni acceso a Supabase: reciben filas ya consultadas y devuelven totales.
 */

const toNumber = (value) => Number(value || 0);

/**
 * Mapea las filas del RPC `get_inventory_report_data` al modelo de item del reporte.
 */
export const mapInventoryRowsToItems = (rows = []) =>
  rows.map((row) => ({
    id: row.product_id,
    barcode: row.barcode || "",
    name: row.product_name || "Sin nombre",
    departmentId: row.department_id,
    departmentName: row.department_name || "Sin departamento",
    tracks_inventory: Boolean(row.tracks_inventory),
    is_kit: Boolean(row.is_kit),
    stock: toNumber(row.stock),
    min_stock: toNumber(row.min_stock),
    max_stock: toNumber(row.max_stock),
    cost_price: toNumber(row.cost_price),
    sale_price: toNumber(row.sale_price),
    total_cost: toNumber(row.total_cost),
    total_sale: toNumber(row.total_sale),
    has_been_stocked: Boolean(row.has_been_stocked),
    has_inventory_record: Boolean(row.has_inventory_record),
    status: row.status || "optimal",
    statusLabel: row.status_label || "Optimo",
    suggestedQty: toNumber(row.suggested_qty),
    estimatedInvestment: toNumber(row.suggested_qty) * toNumber(row.cost_price),
  }));

/**
 * KPIs consolidados del inventario (valorizacion, margen y conteos por estado).
 */
export const calculateInventoryKpis = (items = []) => {
  let totalCostValuation = 0;
  let totalSaleValuation = 0;
  let totalUnits = 0;
  let exhaustedCount = 0;
  let lowStockCount = 0;
  let optimalStockCount = 0;
  let excessStockCount = 0;

  items.forEach((item) => {
    if (item.tracks_inventory && item.stock > 0) {
      totalCostValuation += item.total_cost;
      totalSaleValuation += item.total_sale;
      totalUnits += item.stock;
    }
    if (item.status === "exhausted") exhaustedCount++;
    else if (item.status === "low") lowStockCount++;
    else if (item.status === "excess") excessStockCount++;
    else if (item.status === "optimal") optimalStockCount++;
  });

  const projectedProfit = Math.max(totalSaleValuation - totalCostValuation, 0);
  const profitMargin =
    totalSaleValuation > 0 ? (projectedProfit / totalSaleValuation) * 100 : 0;

  return {
    totalCostValuation,
    totalSaleValuation,
    projectedProfit,
    profitMargin,
    totalUnits,
    totalSkus: items.filter((i) => i.tracks_inventory).length,
    exhaustedCount,
    lowStockCount,
    optimalStockCount,
    excessStockCount,
  };
};

/**
 * Agrupacion por departamento, ordenada por valor al costo descendente.
 */
export const buildDepartmentBreakdown = (
  items = [],
  totalCostValuation = 0
) => {
  const accumulator = {};

  items.forEach((item) => {
    const deptName = item.departmentName || "Sin departamento";
    if (!accumulator[deptName]) {
      accumulator[deptName] = {
        name: deptName,
        productCount: 0,
        totalUnits: 0,
        totalCost: 0,
        totalSale: 0,
      };
    }
    accumulator[deptName].productCount += 1;
    accumulator[deptName].totalUnits += item.stock;
    accumulator[deptName].totalCost += item.total_cost;
    accumulator[deptName].totalSale += item.total_sale;
  });

  return Object.values(accumulator)
    .map((dept) => ({
      ...dept,
      percentage:
        totalCostValuation > 0
          ? (dept.totalCost / totalCostValuation) * 100
          : 0,
    }))
    .sort((a, b) => b.totalCost - a.totalCost);
};

/**
 * Productos que requieren reposicion (agotados o con stock bajo).
 */
export const buildReorderSuggestions = (items = []) =>
  items
    .filter(
      (i) =>
        i.tracks_inventory && (i.status === "exhausted" || i.status === "low")
    )
    .sort((a, b) => a.stock - b.stock);

/**
 * Productos agotados ordenados por nombre.
 */
export const buildExhaustedProducts = (items = []) =>
  items
    .filter((i) => i.tracks_inventory && i.status === "exhausted")
    .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Departamentos unicos presentes en los items, para el filtro del reporte.
 */
export const buildDepartments = (items = []) => {
  const map = {};
  items.forEach((item) => {
    if (item.departmentId && !map[item.departmentId]) {
      map[item.departmentId] = {
        id: item.departmentId,
        name: item.departmentName,
      };
    }
  });
  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
};
