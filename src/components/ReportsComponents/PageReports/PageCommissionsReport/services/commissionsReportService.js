/**
 * commissionsReportService.js
 * Servicio de datos para el Reporte de Comisiones de Cajeros.
 * Maneja llamadas a Supabase y mapeo estructurado.
 */

import { supabase } from "../../../../../lib/supabaseClient";
import { calculateItemCommission } from "./commissionsCalculationService";

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

  return [
    { id: "ALL", name: "Todas las sucursales" },
    ...data.map((b) => ({ id: b.id, name: b.name })),
  ];
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

  return [
    { id: "ALL", name: "Todos los cajeros" },
    ...data.map((u) => ({
      id: u.id,
      name: u.username ? toUpper(u.username) : "SIN NOMBRE",
    })),
  ];
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

  return [
    { id: "ALL", name: "Todos los departamentos" },
    ...data.map((d) => ({ id: d.id, name: d.name })),
  ];
};

/**
 * Consulta las ventas completadas y sus partidas comisionables en el rango de fechas.
 */
export const fetchCommissionsData = async ({
  startDateIso,
  endDateIso,
  branchId = "ALL",
  cashierId = "ALL",
  departmentId = "ALL",
}) => {
  let salesQuery = supabase
    .from("sales")
    .select("id, branch_id, user_id, created_at, status, branches(name), users(username)")
    .gte("created_at", startDateIso)
    .lte("created_at", endDateIso)
    .neq("status", "canceled");

  if (branchId !== "ALL") {
    salesQuery = salesQuery.eq("branch_id", branchId);
  }
  if (cashierId !== "ALL") {
    salesQuery = salesQuery.eq("user_id", cashierId);
  }

  const { data: sales, error: salesError } = await salesQuery;
  if (salesError) {
    console.error("Error al consultar ventas para comisiones:", salesError);
    throw new Error("Error al consultar las ventas en el periodo.");
  }

  if (!sales || sales.length === 0) {
    return { detailedRows: [] };
  }

  const salesMap = new Map(sales.map((s) => [s.id, s]));
  const saleIds = Array.from(salesMap.keys());

  // Consulta por lotes de partidas para optimizar rendimiento en Supabase
  const chunkSize = 150;
  const detailedRows = [];

  for (let i = 0; i < saleIds.length; i += chunkSize) {
    const chunk = saleIds.slice(i, i + chunkSize);

    const { data: details, error: detailsError } = await supabase
      .from("sale_details")
      .select(
        `id, sale_id, product_id, quantity, unit_price, total_price,
         products (
           id, barcode, name, department_id,
           commission_enabled, commission_type, commission_value, commission_percent,
           departments ( id, name, commission_enabled, commission_type, commission_value )
         )`
      )
      .in("sale_id", chunk);

    if (detailsError) {
      console.error("Error al consultar partidas de ventas para comisiones:", detailsError);
      throw new Error("Error al consultar el detalle de productos vendidos.");
    }

    if (!details) continue;

    details.forEach((item) => {
      const parentSale = salesMap.get(item.sale_id);
      if (!parentSale) return;

      const product = item.products || {};
      const department = product.departments || {};

      // Filtro opcional por departamento
      if (departmentId !== "ALL" && product.department_id !== departmentId) {
        return;
      }

      const commissionCalc = calculateItemCommission(item);

      detailedRows.push({
        detailId: item.id,
        saleId: parentSale.id,
        ticketNumber: parentSale.id ? parentSale.id.substring(0, 8).toUpperCase() : "S/N",
        createdAt: parentSale.created_at,
        branchId: parentSale.branch_id,
        branchName: parentSale.branches?.name || "General",
        cashierId: parentSale.user_id,
        cashierName: parentSale.users?.username ? toUpper(parentSale.users.username) : "SISTEMA",
        productId: product.id || item.product_id,
        barcode: product.barcode || "---",
        productName: product.name || "Producto sin nombre",
        departmentId: product.department_id,
        departmentName: department.name || "Sin Departamento",
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unit_price) || 0,
        totalPrice: Number(item.total_price) || 0,
        hasCommission: commissionCalc.hasCommission,
        commissionAmount: commissionCalc.commissionAmount,
        commissionType: commissionCalc.commissionType,
        commissionValue: commissionCalc.commissionValue,
        ruleLabel: commissionCalc.ruleLabel,
      });
    });
  }

  return { detailedRows };
};
