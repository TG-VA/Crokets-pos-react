/**
 * cashReportCalculationService.js
 * Funciones puras de cálculo, conciliación y auditoría para el Reporte de Caja.
 */

/**
 * Calcula los KPIs ejecutivos del reporte de caja para el periodo consultado
 */
export const calculateCashReportKpis = (sessions = [], movements = [], paymentSummary = []) => {
  let totalOpening = 0;
  let totalCountedCash = 0;
  let totalDifference = 0;
  let sessionsWithDiscrepancy = 0;
  let totalClosedSessions = 0;

  sessions.forEach((s) => {
    totalOpening += Number(s.opening_amount || 0);

    if (s.status === "closed") {
      totalClosedSessions += 1;
      totalCountedCash += Number(s.closing_amount || 0);
      const diff = Number(s.difference || 0);
      totalDifference += diff;

      if (Math.abs(diff) > 0.01) {
        sessionsWithDiscrepancy += 1;
      }
    }
  });

  let totalManualInflow = 0;
  let totalManualOutflow = 0;

  movements.forEach((m) => {
    const type = String(m.movement_type || "").toLowerCase();
    const amt = Number(m.amount || 0);
    if (type.includes("entry") || type.includes("in") || type.includes("ingreso") || type.includes("entrada")) {
      totalManualInflow += amt;
    } else {
      totalManualOutflow += amt;
    }
  });

  // Ventas en efectivo consolidadas (suma de todas las sesiones de la tabla)
  let totalCashSales = sessions.reduce((acc, s) => acc + Number(s.cashSales || 0), 0);

  // Si no hubiera sesiones cargadas pero sí resumen de métodos de pago
  if (totalCashSales === 0 && paymentSummary.length > 0) {
    totalCashSales = paymentSummary
      .filter((p) => p.affectsCash || String(p.methodName || "").toLowerCase().includes("efectivo"))
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  }

  const totalExpectedCash = totalOpening + totalCashSales + totalManualInflow - totalManualOutflow;

  return {
    totalOpening,
    totalCashSales,
    totalManualInflow,
    totalManualOutflow,
    totalExpectedCash,
    totalCountedCash,
    totalDifference,
    totalSessions: sessions.length,
    totalClosedSessions,
    sessionsWithDiscrepancy,
  };
};

/**
 * Agrupa y audita discrepancias por cajero
 */
export const calculateCashierDiscrepancies = (sessions = []) => {
  const cashierMap = {};

  sessions.forEach((s) => {
    const cashierId = s.user_id || "unknown";
    const cashierName = s.users?.username || "Usuario desconocido";
    const diff = Number(s.difference || 0);
    const isClosed = s.status === "closed";

    if (!cashierMap[cashierId]) {
      cashierMap[cashierId] = {
        userId: cashierId,
        username: cashierName,
        totalSessions: 0,
        closedSessions: 0,
        exactSessions: 0,
        shortageCount: 0,
        surplusCount: 0,
        totalShortage: 0,
        totalSurplus: 0,
        netDifference: 0,
      };
    }

    cashierMap[cashierId].totalSessions += 1;

    if (isClosed) {
      cashierMap[cashierId].closedSessions += 1;
      cashierMap[cashierId].netDifference += diff;

      if (Math.abs(diff) <= 0.01) {
        cashierMap[cashierId].exactSessions += 1;
      } else if (diff < 0) {
        cashierMap[cashierId].shortageCount += 1;
        cashierMap[cashierId].totalShortage += Math.abs(diff);
      } else {
        cashierMap[cashierId].surplusCount += 1;
        cashierMap[cashierId].totalSurplus += diff;
      }
    }
  });

  return Object.values(cashierMap).map((c) => ({
    ...c,
    accuracyRate: c.closedSessions > 0 ? (c.exactSessions / c.closedSessions) * 100 : 100,
  })).sort((a, b) => a.netDifference - b.netDifference);
};
