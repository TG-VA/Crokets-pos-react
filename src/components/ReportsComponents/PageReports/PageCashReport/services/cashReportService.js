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
 * Consulta de sesiones de caja con sus respectivos cortes y enriquecimiento en lote
 */
export const fetchCashSessions = async ({
  branchId = "ALL",
  startDate = null,
  endDate = null,
  cashierId = "ALL",
  sessionStatus = "ALL",
}) => {
  try {
    let query = supabase
      .from("cash_register_sessions")
      .select(`
        id,
        user_id,
        branch_id,
        opening_amount,
        closing_amount,
        opened_at,
        closed_at,
        status,
        difference,
        users (
          id,
          username
        ),
        branches (
          id,
          name,
          timezone
        ),
        cash_cuts (
          id,
          cut_type,
          expected_amount,
          counted_amount,
          difference,
          notes,
          created_at
        )
      `)
      .order("opened_at", { ascending: false });

    // Filtro por sucursal
    if (branchId && branchId !== "ALL") {
      query = query.eq("branch_id", branchId);
    }

    // Filtro por cajero
    if (cashierId && cashierId !== "ALL") {
      query = query.eq("user_id", cashierId);
    }

    // Filtro por estado
    if (sessionStatus && sessionStatus !== "ALL") {
      query = query.eq("status", sessionStatus);
    }

    // Filtro por rango de fechas
    const { startIso, endIso } = buildIsoDateRange(startDate, endDate);
    if (startIso && endIso) {
      query = query.gte("opened_at", startIso).lte("opened_at", endIso);
    }

    const { data: rawSessions, error } = await query.limit(5000);
    if (error) throw error;

    if (!rawSessions || rawSessions.length === 0) {
      return [];
    }

    // Obtener IDs de sesiones
    const sessionIds = rawSessions.map((s) => s.id);

    // Consultar movimientos de las sesiones
    let movementsBySession = {};
    try {
      const { data: movsRes } = await supabase
        .from("cash_movements")
        .select("id, session_id, movement_type, amount")
        .in("session_id", sessionIds)
        .limit(10000);

      (movsRes || []).forEach((m) => {
        if (!movementsBySession[m.session_id]) {
          movementsBySession[m.session_id] = { manualIn: 0, manualOut: 0 };
        }
        const type = String(m.movement_type || "").toLowerCase();
        const amt = Number(m.amount || 0);
        if (type.includes("entry") || type.includes("in") || type.includes("ingreso") || type.includes("entrada")) {
          movementsBySession[m.session_id].manualIn += amt;
        } else {
          movementsBySession[m.session_id].manualOut += amt;
        }
      });
    } catch (movErr) {
      console.error("Error al consultar movimientos por sesión:", movErr);
    }

    // Consultar pagos y ventas EXACTAS para cada sesión en paralelo (idéntico al modal)
    const sessionTotalsList = await Promise.all(
      rawSessions.map(async (sess) => {
        try {
          const sStart = sess.opened_at;
          const sEnd = sess.closed_at || new Date().toISOString();

          const { data: salesPayments, error: pErr } = await supabase
            .from("sale_payments")
            .select(`
              id,
              amount,
              payment_method_id,
              payment_methods (id, name, affects_cash),
              sales!inner (
                id,
                user_id,
                branch_id,
                status,
                created_at
              )
            `)
            .eq("sales.branch_id", sess.branch_id)
            .eq("sales.user_id", sess.user_id)
            .gte("sales.created_at", sStart)
            .lte("sales.created_at", sEnd)
            .in("sales.status", ["completed", "partial_refund"])
            .limit(5000);

          if (pErr || !salesPayments) {
            return { cashSales: 0, cardSales: 0, totalSales: 0 };
          }

          let cashSales = 0;
          let cardSales = 0;

          salesPayments.forEach((p) => {
            const amt = Number(p.amount || 0);
            const affectsCash = Boolean(
              p.payment_methods?.affects_cash ||
              String(p.payment_methods?.name || "").toLowerCase().includes("efectivo")
            );

            if (affectsCash) {
              cashSales += amt;
            } else {
              cardSales += amt;
            }
          });

          return {
            cashSales,
            cardSales,
            totalSales: cashSales + cardSales,
          };
        } catch (calcErr) {
          console.error("Error calculando ventas de sesión:", calcErr);
          return { cashSales: 0, cardSales: 0, totalSales: 0 };
        }
      })
    );

    // Enriquecer cada sesión con sus métricas calculadas idénticas al modal
    return rawSessions.map((sess, idx) => {
      const pm = sessionTotalsList[idx] || { cashSales: 0, cardSales: 0, totalSales: 0 };
      const mov = movementsBySession[sess.id] || { manualIn: 0, manualOut: 0 };
      const opening = Number(sess.opening_amount || 0);
      const expectedCash = opening + pm.cashSales + mov.manualIn - mov.manualOut;

      return {
        ...sess,
        cashSales: pm.cashSales,
        cardSales: pm.cardSales,
        totalSales: pm.totalSales,
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
