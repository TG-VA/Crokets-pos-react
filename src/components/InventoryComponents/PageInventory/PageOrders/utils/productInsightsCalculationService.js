// Normalizacion y totales del detalle de producto por sucursal. Funciones
// puras: no consultan la base ni dependen de React.

export const STOCK_LEVEL = {
  LOW: "low",
  HIGH: "high",
  NORMAL: "normal",
};

const toFiniteNumber = (value, fallback = 0) => {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : fallback;
};

const toNullableNumber = (value) =>
  value === null || value === undefined ? null : toFiniteNumber(value);

/**
 * Bajo minimo: hay minimo configurado y el stock es igual o menor (misma regla
 * que el reporte de inventario). Sobre maximo: hay maximo configurado y el
 * stock lo supera. Si ambos limites estan mal configurados y se cruzan, gana
 * bajo minimo porque es el caso que requiere accion.
 */
export const getStockLevel = (stock, minStock, maxStock) => {
  if (minStock !== null && minStock > 0 && stock <= minStock) {
    return STOCK_LEVEL.LOW;
  }

  if (maxStock !== null && maxStock > 0 && stock > maxStock) {
    return STOCK_LEVEL.HIGH;
  }

  return STOCK_LEVEL.NORMAL;
};

const compareByStockDescending = (left, right) =>
  right.stock - left.stock ||
  left.branchName.localeCompare(right.branchName, "es", {
    sensitivity: "base",
    numeric: true,
  });

export const normalizeInsightRows = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const stock = toFiniteNumber(row?.stock);
      const minStock = toNullableNumber(row?.min_stock);
      const maxStock = toNullableNumber(row?.max_stock);

      return {
        branchId: row?.branch_id ?? "",
        branchName: row?.branch_name ?? "Sucursal sin nombre",
        stock,
        minStock,
        maxStock,
        stockLevel: getStockLevel(stock, minStock, maxStock),
        unitsSold: toFiniteNumber(row?.units_sold),
        redeemedUnits: toFiniteNumber(row?.redeemed_units),
        revenue: toFiniteNumber(row?.revenue),
      };
    })
    .sort(compareByStockDescending);

export const getInsightTotals = (rows = []) =>
  (Array.isArray(rows) ? rows : []).reduce(
    (totals, row) => ({
      stock: totals.stock + toFiniteNumber(row?.stock),
      unitsSold: totals.unitsSold + toFiniteNumber(row?.unitsSold),
      redeemedUnits: totals.redeemedUnits + toFiniteNumber(row?.redeemedUnits),
      revenue: totals.revenue + toFiniteNumber(row?.revenue),
    }),
    { stock: 0, unitsSold: 0, redeemedUnits: 0, revenue: 0 }
  );
