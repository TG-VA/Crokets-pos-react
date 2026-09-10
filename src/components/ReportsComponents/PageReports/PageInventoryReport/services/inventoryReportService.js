import { supabase } from "../../../../../lib/supabaseClient";

/**
 * Consulta el catalogo de sucursales para el filtro del reporte.
 */
export const fetchBranchesList = async () => {
  try {
    const { data, error } = await supabase
      .from("branches")
      .select("id, name, timezone")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error al consultar sucursales en inventoryReportService:", err);
    return [];
  }
};

/**
 * Consulta los datos del reporte de inventario via RPC.
 * Reemplaza las 3 queries paralelas (products + branch_inventory + departments)
 * con una sola consulta que calcula valorizaciones y estados en el servidor.
 */
export const fetchInventoryReportData = async (branchId = "ALL") => {
  try {
    const { data: rpcRows, error: rpcError } = await supabase.rpc(
      "get_inventory_report_data",
      {
        p_branch_id: branchId !== "ALL" ? branchId : null,
      }
    );

    if (rpcError) throw rpcError;

    const rows = rpcRows || [];

    // Calcular estimated_investment en cliente (depende de cost_price ya resuelto)
    const items = rows.map((row) => ({
      id: row.product_id,
      barcode: row.barcode || "",
      name: row.product_name || "Sin nombre",
      departmentId: row.department_id,
      departmentName: row.department_name || "Sin departamento",
      tracks_inventory: Boolean(row.tracks_inventory),
      is_kit: Boolean(row.is_kit),
      stock: Number(row.stock || 0),
      min_stock: Number(row.min_stock || 0),
      max_stock: Number(row.max_stock || 0),
      cost_price: Number(row.cost_price || 0),
      sale_price: Number(row.sale_price || 0),
      total_cost: Number(row.total_cost || 0),
      total_sale: Number(row.total_sale || 0),
      has_been_stocked: Boolean(row.has_been_stocked),
      has_inventory_record: Boolean(row.has_inventory_record),
      status: row.status || "optimal",
      statusLabel: row.status_label || "Optimo",
      suggestedQty: Number(row.suggested_qty || 0),
      estimatedInvestment: Number(row.suggested_qty || 0) * Number(row.cost_price || 0),
    }));

    // KPIs consolidados
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
    const profitMargin = totalSaleValuation > 0 ? (projectedProfit / totalSaleValuation) * 100 : 0;

    const kpis = {
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

    // Agrupacion por departamento
    const deptAccumulator = {};
    items.forEach((item) => {
      const deptName = item.departmentName || "Sin departamento";
      if (!deptAccumulator[deptName]) {
        deptAccumulator[deptName] = {
          name: deptName,
          productCount: 0,
          totalUnits: 0,
          totalCost: 0,
          totalSale: 0,
        };
      }
      deptAccumulator[deptName].productCount += 1;
      deptAccumulator[deptName].totalUnits += item.stock;
      deptAccumulator[deptName].totalCost += item.total_cost;
      deptAccumulator[deptName].totalSale += item.total_sale;
    });

    const byDepartment = Object.values(deptAccumulator)
      .map((dept) => ({
        ...dept,
        percentage: totalCostValuation > 0 ? (dept.totalCost / totalCostValuation) * 100 : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    // Listas especializadas
    const reorderSuggestions = items
      .filter((i) => i.tracks_inventory && (i.status === "exhausted" || i.status === "low"))
      .sort((a, b) => a.stock - b.stock);

    const exhaustedProducts = items
      .filter((i) => i.tracks_inventory && i.status === "exhausted")
      .sort((a, b) => a.name.localeCompare(b.name));

    // Departamentos unicos para el filtro
    const departmentsMap = {};
    items.forEach((item) => {
      if (item.departmentId && !departmentsMap[item.departmentId]) {
        departmentsMap[item.departmentId] = { id: item.departmentId, name: item.departmentName };
      }
    });
    const departments = Object.values(departmentsMap).sort((a, b) => a.name.localeCompare(b.name));

    return {
      items,
      kpis,
      byDepartment,
      reorderSuggestions,
      exhaustedProducts,
      departments,
    };
  } catch (error) {
    console.error("Error al obtener datos del reporte de inventario:", error);
    throw error;
  }
};
