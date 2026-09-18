import { supabase } from "../../../../../lib/supabaseClient";
import {
  mapInventoryRowsToItems,
  calculateInventoryKpis,
  buildDepartmentBreakdown,
  buildReorderSuggestions,
  buildExhaustedProducts,
  buildDepartments,
} from "./inventoryReportCalculationService";

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
    console.error(
      "Error al consultar sucursales en inventoryReportService:",
      err
    );
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
    const { data: rpcRows, error: rpcError } = await supabase
      .rpc("get_inventory_report_data", {
        p_branch_id: branchId !== "ALL" ? branchId : null,
      })
      .limit(100000);

    if (rpcError) throw rpcError;

    const items = mapInventoryRowsToItems(rpcRows || []);
    const kpis = calculateInventoryKpis(items);

    return {
      items,
      kpis,
      byDepartment: buildDepartmentBreakdown(items, kpis.totalCostValuation),
      reorderSuggestions: buildReorderSuggestions(items),
      exhaustedProducts: buildExhaustedProducts(items),
      departments: buildDepartments(items),
    };
  } catch (error) {
    console.error("Error al obtener datos del reporte de inventario:", error);
    throw error;
  }
};
