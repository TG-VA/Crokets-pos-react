/**
 * commissionsReportService.js
 * Servicio de datos para el Reporte de Comisiones de Cajeros.
 * Maneja llamadas a Supabase y mapeo estructurado.
 */

import { supabase } from "../../../../../lib/supabaseClient";

const toUpper = (str) => (str ? str.toUpperCase() : "");

export const getBranchesList = async () => {
  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error al obtener catálogo de sucursales:", error);
    throw new Error("No se pudo cargar el catálogo de sucursales.");
  }

  return (data || []).map((b) => ({ id: b.id, name: b.name }));
};

export const getCashiersList = async () => {
  const { data, error } = await supabase
    .from("users")
    .select("id, username")
    .eq("status", true)
    .order("username", { ascending: true });

  if (error) {
    console.error("Error al obtener catálogo de cajeros:", error);
    throw new Error("No se pudo cargar el catálogo de cajeros.");
  }

  return (data || []).map((u) => ({
    id: u.id,
    name: u.username ? toUpper(u.username) : "SIN NOMBRE",
  }));
};

export const getDepartmentsList = async () => {
  const { data, error } = await supabase
    .from("departments")
    .select("id, name")
    .eq("status", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error al obtener catálogo de departamentos:", error);
    throw new Error("No se pudo cargar el catálogo de departamentos.");
  }

  return (data || []).map((d) => ({ id: d.id, name: d.name }));
};

/**
 * Consulta las ventas completadas y sus partidas comisionables via RPC.
 * Reemplaza el fetch secuencial de sales + sale_details en chunks.
 */
export const fetchCommissionsData = async ({
  startDateIso,
  endDateIso,
  branchId = "ALL",
  cashierId = "ALL",
  departmentId = "ALL",
}) => {
  const { data: rpcRows, error: rpcError } = await supabase.rpc(
    "get_commissions_report_data",
    {
      p_start_date: startDateIso,
      p_end_date: endDateIso,
      p_branch_id: branchId !== "ALL" ? branchId : null,
      p_cashier_id: cashierId !== "ALL" ? cashierId : null,
      p_department_id: departmentId !== "ALL" ? departmentId : null,
    }
  ).limit(100000);

  if (rpcError) {
    console.error("Error al consultar comisiones via RPC:", rpcError);
    throw new Error("Error al consultar las ventas en el periodo.");
  }

  const rows = rpcRows || [];

  const detailedRows = rows.map((row) => ({
    detailId: row.detail_id,
    saleId: row.sale_id,
    ticketNumber: row.ticket_number || "S/N",
    createdAt: row.created_at,
    branchId: row.branch_id,
    branchName: row.branch_name || "General",
    cashierId: row.cashier_id,
    cashierName: row.cashier_name ? row.cashier_name.toUpperCase() : "SISTEMA",
    productId: row.product_id,
    barcode: row.barcode || "---",
    productName: row.product_name || "Producto sin nombre",
    departmentId: row.department_id,
    departmentName: row.department_name || "Sin Departamento",
    quantity: Number(row.quantity) || 0,
    unitPrice: Number(row.unit_price) || 0,
    catalogPrice: Number(row.catalog_price) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    discountType: row.discount_type || null,
    hasDiscount: Boolean(row.has_discount),
    totalPrice: Number(row.total_price) || 0,
    hasCommission: Boolean(row.has_commission),
    commissionAmount: Number(row.commission_amount) || 0,
    commissionType: row.commission_type || null,
    commissionValue: Number(row.commission_value) || 0,
    ruleLabel: row.rule_label || "Sin comision",
  }));

  return { detailedRows };
};

/**
 * Carga el reporte de comisiones y entrega el resultado por callbacks.
 *
 * La orquestacion vive en el servicio para que el efecto que dispara la consulta
 * no escriba estado: todas las actualizaciones de React ocurren en la
 * continuacion asincrona, ya despues del `await`, de modo que no se provoca el
 * re-render en cascada del `setIsLoading(true)` sincrono. `onSettled` se invoca
 * siempre, incluido el error, para que el hook pueda marcar la peticion como
 * resuelta y derivar su estado de carga.
 *
 * @param {{ startDateIso: string, endDateIso: string, branchId: string, cashierId: string, departmentId: string }} params
 * @param {{ onData: Function, onError: Function, onSettled: Function }} handlers
 */
export const loadCommissionsReport = async (
  { startDateIso, endDateIso, branchId, cashierId, departmentId },
  { onData, onError, onSettled }
) => {
  try {
    onData(
      await fetchCommissionsData({
        startDateIso,
        endDateIso,
        branchId,
        cashierId,
        departmentId,
      })
    );
  } catch (err) {
    console.error("Error al cargar comisiones:", err);
    onError("No se pudieron cargar los datos de comisiones. Intenta de nuevo.");
  } finally {
    onSettled();
  }
};
