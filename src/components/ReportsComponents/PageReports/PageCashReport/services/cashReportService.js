/**
 * cashReportService.js
 * Servicio principal de consultas a base de datos y punto de acceso unificado del módulo de Caja.
 */

import { supabase } from "../../../../../lib/supabaseClient";

// Re-exportar servicios modulares
export { calculateCashReportKpis, calculateCashierDiscrepancies } from "./cashReportCalculationService";
export { fetchCashSessionDetail } from "./cashReportDetailService";

/**
 * Normaliza un rango de fechas a formato ISO para consultas de Supabase
 */
export const buildIsoDateRange = (startDate, endDate) => {
  if (!startDate) return { startIso: null, endIso: null };

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate || startDate);
  end.setHours(23, 59, 59, 999);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

/**
 * Consulta la lista de sucursales disponibles
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
    console.error("Error al consultar sucursales en cashReportService:", err);
    return [];
  }
};

/**
 * Consulta la lista de cajeros / usuarios para filtros
 */
export const fetchCashiersList = async () => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, email")
      .order("username", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error al consultar usuarios en cashReportService:", err);
    return [];
  }
};

/**
 * Consulta de sesiones de caja via RPC (elimina el patron N+1).
 * La RPC get_cash_report_sessions calcula los totales de ventas (efectivo/tarjeta)
 * en el servidor. Solo falta obtener los movimientos de caja por separado.
 */
export const fetchCashSessions = async ({
  branchId = "ALL",
  startDate = null,
  endDate = null,
  cashierId = "ALL",
  sessionStatus = "ALL",
}) => {
  try {
    const { startIso, endIso } = buildIsoDateRange(startDate, endDate);

    const { data: rpcRows, error: rpcError } = await supabase.rpc(
      "get_cash_report_sessions",
      {
        p_branch_id: branchId !== "ALL" ? branchId : null,
        p_start_date: startIso || null,
        p_end_date: endIso || null,
        p_cashier_id: cashierId !== "ALL" ? cashierId : null,
        p_session_status: sessionStatus !== "ALL" ? sessionStatus : null,
      }
    );

    if (rpcError) throw rpcError;

    const rawSessions = rpcRows || [];
    if (rawSessions.length === 0) {
      return [];
    }

    const sessionIds = rawSessions.map((s) => s.session_id);

    // Consultar movimientos de caja en lote (1 query, no N)
    let movementsBySession = {};
    try {
      const { data: movsRes, error: movsError } = await supabase
        .from("cash_movements")
        .select("id, session_id, movement_type, amount")
        .in("session_id", sessionIds)
        .limit(100000);

      if (movsError) {
        console.error(
          "Error al consultar movimientos por sesion en cashReportService:",
          movsError
        );
      } else {
        (movsRes || []).forEach((m) => {
          if (!movementsBySession[m.session_id]) {
            movementsBySession[m.session_id] = { manualIn: 0, manualOut: 0 };
          }
          const type = String(m.movement_type || "").toLowerCase();
          const amt = Number(m.amount || 0);
          if (
            type.includes("entry") ||
            type.includes("in") ||
            type.includes("ingreso") ||
            type.includes("entrada")
          ) {
            movementsBySession[m.session_id].manualIn += amt;
          } else {
            movementsBySession[m.session_id].manualOut += amt;
          }
        });
      }
    } catch (movErr) {
      console.error("Error al consultar movimientos por sesion:", movErr);
    }

    return rawSessions.map((row) => {
      const mov = movementsBySession[row.session_id] || { manualIn: 0, manualOut: 0 };
      const opening = Number(row.opening_amount || 0);
      const cashSales = Number(row.cash_sales || 0);
      const expectedCash = opening + cashSales + mov.manualIn - mov.manualOut;

      return {
        id: row.session_id,
        user_id: row.user_id,
        branch_id: row.branch_id,
        opening_amount: row.opening_amount,
        closing_amount: row.closing_amount,
        opened_at: row.opened_at,
        closed_at: row.closed_at,
        status: row.session_status,
        difference: row.difference,
        users: { id: row.user_id, username: row.username },
        branches: { id: row.branch_id, name: row.branch_name, timezone: row.branch_timezone },
        cash_cuts: row.cash_cuts || [],
        cashSales,
        cardSales: Number(row.card_sales || 0),
        totalSales: Number(row.total_sales || 0),
        manualIn: mov.manualIn,
        manualOut: mov.manualOut,
        expectedCash,
      };
    });
  } catch (err) {
    console.error("Error al consultar sesiones de caja en cashReportService:", err);
    throw err;
  }
};

/**
 * Consulta de movimientos de caja (ingresos, retiros, gastos fuera de venta)
 */
export const fetchCashMovements = async ({
  branchId = "ALL",
  startDate = null,
  endDate = null,
  cashierId = "ALL",
  movementType = "ALL",
}) => {
  try {
    let query = supabase
      .from("cash_movements")
      .select(`
        id,
        session_id,
        user_id,
        branch_id,
        movement_type,
        amount,
        description,
        created_at,
        users (
          id,
          username
        ),
        branches (
          id,
          name,
          timezone
        )
      `)
      .order("created_at", { ascending: false });

    if (branchId && branchId !== "ALL") {
      query = query.eq("branch_id", branchId);
    }

    if (cashierId && cashierId !== "ALL") {
      query = query.eq("user_id", cashierId);
    }

    if (movementType && movementType !== "ALL") {
      query = query.ilike("movement_type", `%${movementType}%`);
    }

    const { startIso, endIso } = buildIsoDateRange(startDate, endDate);
    if (startIso && endIso) {
      query = query.gte("created_at", startIso).lte("created_at", endIso);
    }

    const { data, error } = await query.limit(10000);
    if (error) throw error;

    return data || [];
  } catch (err) {
    console.error("Error al consultar movimientos de caja en cashReportService:", err);
    throw err;
  }
};

/**
 * Obtiene el resumen de ventas y pagos asociados al período para conciliar formas de pago
 */
export const fetchPaymentMethodsSummary = async ({
  branchId = "ALL",
  startDate = null,
  endDate = null,
}) => {
  try {
    let query = supabase
      .from("sale_payments")
      .select(`
        id,
        sale_id,
        payment_method_id,
        branch_id,
        amount,
        created_at,
        payment_methods (
          id,
          name,
          affects_cash
        ),
        sales!inner (
          id,
          status,
          created_at
        )
      `)
      .in("sales.status", ["completed", "partial_refund"]);

    if (branchId && branchId !== "ALL") {
      query = query.eq("branch_id", branchId);
    }

    const { startIso, endIso } = buildIsoDateRange(startDate, endDate);
    if (startIso && endIso) {
      query = query.gte("sales.created_at", startIso).lte("sales.created_at", endIso);
    }

    const { data, error } = await query.limit(15000);
    if (error) throw error;

    // Agrupar por método de pago
    const summaryMap = {};

    (data || []).forEach((row) => {
      const methodId = row.payment_method_id || "unknown";
      const methodName = row.payment_methods?.name || "Sin método especificado";
      const affectsCash = Boolean(row.payment_methods?.affects_cash);
      const amount = Number(row.amount || 0);

      if (!summaryMap[methodId]) {
        summaryMap[methodId] = {
          id: methodId,
          methodName,
          affectsCash,
          count: 0,
          amount: 0,
        };
      }

      summaryMap[methodId].count += 1;
      summaryMap[methodId].amount += amount;
    });

    return Object.values(summaryMap).sort((a, b) => b.amount - a.amount);
  } catch (err) {
    console.error("Error al obtener resumen de métodos de pago en cashReportService:", err);
    return [];
  }
};
