const toFiniteOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
};

const sumField = (rows, field) =>
  rows.reduce((total, row) => total + (toFiniteOrNull(row?.[field]) ?? 0), 0);

/**
 * Resumen del rango consultado sobre filas ya construidas con buildKardexRows
 * (orden del mas reciente al mas antiguo).
 *
 * Decision del saldo anterior: es el `previousStock` del movimiento mas antiguo
 * del rango. Si el rango no tiene movimientos no se consulta el ultimo
 * movimiento previo (evita una lectura extra) y el saldo queda en null; la
 * tabla muestra su estado vacio.
 *
 * Los saldos siempre se calculan con todas las filas del rango; los totales
 * de entradas y salidas usan `visibleRows` para reflejar un filtro por tipo.
 */
export const buildKardexRangeSummary = (rows, { visibleRows } = {}) => {
  const rangeRows = Array.isArray(rows) ? rows : [];

  const totalsRows = Array.isArray(visibleRows) ? visibleRows : rangeRows;

  const totalEntries = sumField(totalsRows, "entryQty");

  const totalExits = sumField(totalsRows, "exitQty");

  if (rangeRows.length === 0) {
    return {
      openingStock: null,
      totalEntries,
      totalExits,
      closingStock: null,
    };
  }

  const openingStock = toFiniteOrNull(
    rangeRows[rangeRows.length - 1]?.previousStock
  );

  const rangeNet =
    sumField(rangeRows, "entryQty") - sumField(rangeRows, "exitQty");

  const closingStock =
    openingStock === null
      ? toFiniteOrNull(rangeRows[0]?.runningStock)
      : openingStock + rangeNet;

  return {
    openingStock,
    totalEntries,
    totalExits,
    closingStock,
  };
};
