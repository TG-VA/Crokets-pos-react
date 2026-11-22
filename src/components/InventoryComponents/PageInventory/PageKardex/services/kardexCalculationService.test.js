import { describe, expect, it } from "vitest";

import { buildKardexRangeSummary } from "./kardexCalculationService";

// Filas en el orden de la vista: del mas reciente al mas antiguo.
const rows = [
  { id: 3, entryQty: 0, exitQty: 2, previousStock: 13, runningStock: 11 },
  { id: 2, entryQty: 5, exitQty: 0, previousStock: 8, runningStock: 13 },
  { id: 1, entryQty: 0, exitQty: 2, previousStock: 10, runningStock: 8 },
];

describe("buildKardexRangeSummary", () => {
  it("toma el saldo anterior del movimiento mas antiguo y suma el rango", () => {
    expect(buildKardexRangeSummary(rows)).toEqual({
      openingStock: 10,
      totalEntries: 5,
      totalExits: 4,
      closingStock: 11,
    });
  });

  it("sin filas devuelve saldos nulos y totales en cero", () => {
    expect(buildKardexRangeSummary([])).toEqual({
      openingStock: null,
      totalEntries: 0,
      totalExits: 0,
      closingStock: null,
    });
    expect(buildKardexRangeSummary(null).totalEntries).toBe(0);
  });

  it("si falta el stock previo, el saldo final sale del movimiento mas reciente", () => {
    const summary = buildKardexRangeSummary([
      { entryQty: 3, exitQty: 0, previousStock: null, runningStock: 9 },
      { entryQty: 0, exitQty: 1, previousStock: null, runningStock: null },
    ]);

    expect(summary.openingStock).toBeNull();
    expect(summary.closingStock).toBe(9);
  });

  it("suma los totales solo de las filas visibles y conserva los saldos del rango", () => {
    const summary = buildKardexRangeSummary(rows, {
      visibleRows: [rows[1]],
    });

    expect(summary).toEqual({
      openingStock: 10,
      totalEntries: 5,
      totalExits: 0,
      closingStock: 11,
    });
  });
});
