// Normalizacion y totales del detalle de producto por sucursal. Funciones
// puras: no consultan la base ni dependen de React.

const toFiniteNumber = (value, fallback = 0) => {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : fallback;
};

export const normalizeInsightRows = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((row) => {
    const stock = toFiniteNumber(row?.stock);
    const minStock =
      row?.min_stock === null || row?.min_stock === undefined
        ? null
        : toFiniteNumber(row.min_stock);

    return {
      branchId: row?.branch_id ?? "",
      branchName: row?.branch_name ?? "Sucursal sin nombre",
      stock,
      minStock,
      belowMinimum: minStock !== null && minStock > 0 && stock <= minStock,
      unitsSold: toFiniteNumber(row?.units_sold),
      revenue: toFiniteNumber(row?.revenue),
    };
  });

export const getInsightTotals = (rows = []) =>
  (Array.isArray(rows) ? rows : []).reduce(
    (totals, row) => ({
      stock: totals.stock + toFiniteNumber(row?.stock),
      unitsSold: totals.unitsSold + toFiniteNumber(row?.unitsSold),
      revenue: totals.revenue + toFiniteNumber(row?.revenue),
    }),
    { stock: 0, unitsSold: 0, revenue: 0 }
  );
