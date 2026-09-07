/**
 * commissionsCalculationService.js
 * Funciones puras de cálculo matemático para el Reporte de Comisiones de Cajeros.
 * No realiza llamadas I/O ni interactúa con la base de datos (SRP & DIP).
 */

/**
 * Calcula la comisión individual devengada en una partida de venta.
 * Soporta comisión por porcentaje sobre importe o monto fijo por pieza.
 */
export const calculateItemCommission = (item) => {
  const product = item.products || {};
  const department = product.departments || {};

  // Determinar si la comisión proviene del producto o del departamento
  let isEnabled = Boolean(product.commission_enabled);
  let commType = product.commission_type || "percent";
  let commVal = Number(product.commission_value || product.commission_percent || 0);

  // Fallback a departamento si el producto no la tiene explícita pero el depto sí
  if (!isEnabled && department.commission_enabled) {
    isEnabled = true;
    commType = department.commission_type || "percent";
    commVal = Number(department.commission_value || 0);
  }

  if (!isEnabled || commVal <= 0) {
    return {
      hasCommission: false,
      commissionAmount: 0,
      commissionType: null,
      commissionValue: 0,
      ruleLabel: "Sin comisión",
    };
  }

  const quantity = Number(item.quantity) || 0;
  const totalPrice = Number(item.total_price) || 0;

  const normalizedType = commType.toLowerCase();
  let commissionAmount = 0;
  let ruleLabel = "";

  if (normalizedType === "percent" || normalizedType === "percentage") {
    commissionAmount = totalPrice * (commVal / 100);
    ruleLabel = `${commVal.toFixed(2)}%`;
  } else {
    // Monto fijo / flat por pieza
    commissionAmount = quantity * commVal;
    ruleLabel = `$${commVal.toFixed(2)} / pz`;
  }

  return {
    hasCommission: true,
    commissionAmount: Math.max(0, commissionAmount),
    commissionType: normalizedType,
    commissionValue: commVal,
    ruleLabel,
  };
};

/**
 * Agrupa las partidas comisionables por cajero para liquidación de nómina.
 */
export const aggregateCashierCommissions = (detailedRows = []) => {
  const cashierMap = new Map();

  detailedRows.forEach((row) => {
    if (!row.hasCommission) return;

    const key = row.cashierId || "UNKNOWN";
    if (!cashierMap.has(key)) {
      cashierMap.set(key, {
        cashierId: key,
        cashierName: row.cashierName || "SISTEMA",
        branchName: row.branchName || "General",
        saleIds: new Set(),
        totalUnits: 0,
        totalSales: 0,
        totalCommission: 0,
      });
    }

    const entry = cashierMap.get(key);
    if (row.saleId) entry.saleIds.add(row.saleId);
    entry.totalUnits += Number(row.quantity) || 0;
    entry.totalSales += Number(row.totalPrice) || 0;
    entry.totalCommission += Number(row.commissionAmount) || 0;
  });

  return Array.from(cashierMap.values())
    .map((c) => ({
      ...c,
      ticketsCount: c.saleIds.size,
      averageCommissionPerTicket: c.saleIds.size > 0 ? c.totalCommission / c.saleIds.size : 0,
    }))
    .sort((a, b) => b.totalCommission - a.totalCommission);
};

/**
 * Agrupa las partidas comisionables por producto para análisis de catálogo.
 */
export const aggregateProductCommissions = (detailedRows = []) => {
  const productMap = new Map();

  detailedRows.forEach((row) => {
    if (!row.hasCommission) return;

    const key = row.productId || row.barcode || "UNKNOWN";
    if (!productMap.has(key)) {
      productMap.set(key, {
        productId: key,
        barcode: row.barcode || "---",
        productName: row.productName || "Producto sin nombre",
        departmentName: row.departmentName || "Sin Depto.",
        ruleLabel: row.ruleLabel || "---",
        totalUnits: 0,
        totalSales: 0,
        totalCommission: 0,
        salesCount: new Set(),
      });
    }

    const entry = productMap.get(key);
    entry.totalUnits += Number(row.quantity) || 0;
    entry.totalSales += Number(row.totalPrice) || 0;
    entry.totalCommission += Number(row.commissionAmount) || 0;
    if (row.saleId) entry.salesCount.add(row.saleId);
  });

  return Array.from(productMap.values())
    .map((p) => ({
      ...p,
      ticketsCount: p.salesCount.size,
    }))
    .sort((a, b) => b.totalCommission - a.totalCommission);
};

/**
 * Calcula los KPIs globales del reporte de comisiones en el periodo.
 */
export const calculateGlobalKpis = (cashierSummaries = [], detailedRows = []) => {
  const commissionableRows = detailedRows.filter((r) => r.hasCommission);

  const totalCommissions = commissionableRows.reduce(
    (acc, r) => acc + (Number(r.commissionAmount) || 0),
    0
  );

  const totalCommissionableSales = commissionableRows.reduce(
    (acc, r) => acc + (Number(r.totalPrice) || 0),
    0
  );

  const totalCommissionableUnits = commissionableRows.reduce(
    (acc, r) => acc + (Number(r.quantity) || 0),
    0
  );

  const topCashier = cashierSummaries.length > 0 ? cashierSummaries[0] : null;

  return {
    totalCommissions,
    totalCommissionableSales,
    totalCommissionableUnits,
    topCashierName: topCashier ? topCashier.cashierName : "Ninguno",
    topCashierAmount: topCashier ? topCashier.totalCommission : 0,
    totalCashiersWithCommissions: cashierSummaries.length,
  };
};
