import { describe, expect, it } from "vitest";

import {
  getInsightTotals,
  normalizeInsightRows,
} from "./productInsightsCalculationService";

describe("normalizeInsightRows", () => {
  it("convierte las filas del RPC y marca bajo minimo", () => {
    const [low, ok, noMin] = normalizeInsightRows([
      {
        branch_id: "b1",
        branch_name: "Centro",
        stock: "2",
        min_stock: "5",
        units_sold: "7",
        revenue: "140.5",
      },
      {
        branch_id: "b2",
        branch_name: "Norte",
        stock: 10,
        min_stock: 5,
        units_sold: 0,
        revenue: 0,
      },
      { branch_id: "b3", branch_name: "Sur", stock: 0, min_stock: null },
    ]);

    expect(low).toEqual({
      branchId: "b1",
      branchName: "Centro",
      stock: 2,
      minStock: 5,
      belowMinimum: true,
      unitsSold: 7,
      revenue: 140.5,
    });
    expect(ok.belowMinimum).toBe(false);
    expect(noMin.minStock).toBeNull();
    expect(noMin.belowMinimum).toBe(false);
    expect(noMin.unitsSold).toBe(0);
  });

  it("devuelve lista vacia con entradas invalidas", () => {
    expect(normalizeInsightRows(null)).toEqual([]);
    expect(normalizeInsightRows(undefined)).toEqual([]);
  });
});

describe("getInsightTotals", () => {
  it("suma stock, unidades e importe de todas las sucursales", () => {
    expect(
      getInsightTotals([
        { stock: 2, unitsSold: 7, revenue: 100 },
        { stock: 3, unitsSold: 1, revenue: 20.5 },
      ])
    ).toEqual({ stock: 5, unitsSold: 8, revenue: 120.5 });
  });

  it("ignora valores no numericos y devuelve ceros sin filas", () => {
    expect(getInsightTotals([])).toEqual({
      stock: 0,
      unitsSold: 0,
      revenue: 0,
    });
    expect(getInsightTotals([{ stock: "x" }]).stock).toBe(0);
  });
});
