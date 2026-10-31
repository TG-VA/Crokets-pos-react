import { describe, expect, it } from "vitest";

import {
  getInsightTotals,
  getStockLevel,
  normalizeInsightRows,
  STOCK_LEVEL,
} from "./productInsightsCalculationService";

describe("getStockLevel", () => {
  it("marca bajo minimo cuando el stock es igual o menor al minimo", () => {
    expect(getStockLevel(5, 5, 20)).toBe(STOCK_LEVEL.LOW);
    expect(getStockLevel(2, 5, 20)).toBe(STOCK_LEVEL.LOW);
  });

  it("marca sobre maximo solo cuando el stock supera el maximo", () => {
    expect(getStockLevel(21, 5, 20)).toBe(STOCK_LEVEL.HIGH);
    expect(getStockLevel(20, 5, 20)).toBe(STOCK_LEVEL.NORMAL);
  });

  it("ignora limites ausentes o en cero", () => {
    expect(getStockLevel(0, null, null)).toBe(STOCK_LEVEL.NORMAL);
    expect(getStockLevel(0, 0, 0)).toBe(STOCK_LEVEL.NORMAL);
    expect(getStockLevel(50, 5, null)).toBe(STOCK_LEVEL.NORMAL);
  });

  it("prioriza bajo minimo si los limites se cruzan", () => {
    expect(getStockLevel(4, 5, 3)).toBe(STOCK_LEVEL.LOW);
  });
});

describe("normalizeInsightRows", () => {
  it("convierte las filas del RPC con ventas, canjes y nivel de stock", () => {
    const [low] = normalizeInsightRows([
      {
        branch_id: "b1",
        branch_name: "Centro",
        stock: "2",
        min_stock: "5",
        max_stock: "30",
        units_sold: "7",
        redeemed_units: "2",
        revenue: "140.5",
      },
    ]);

    expect(low).toEqual({
      branchId: "b1",
      branchName: "Centro",
      stock: 2,
      minStock: 5,
      maxStock: 30,
      stockLevel: STOCK_LEVEL.LOW,
      unitsSold: 7,
      redeemedUnits: 2,
      revenue: 140.5,
    });
  });

  it("ordena de mayor a menor stock y desempata por nombre", () => {
    const names = normalizeInsightRows([
      { branch_id: "a", branch_name: "Norte", stock: 3 },
      { branch_id: "b", branch_name: "Centro", stock: 10 },
      { branch_id: "c", branch_name: "Abasto", stock: 3 },
    ]).map((row) => row.branchName);

    expect(names).toEqual(["Centro", "Abasto", "Norte"]);
  });

  it("deja los limites en null y las ventas en cero si no vienen", () => {
    const [row] = normalizeInsightRows([
      { branch_id: "b3", branch_name: "Sur", stock: 0 },
    ]);

    expect(row.minStock).toBeNull();
    expect(row.maxStock).toBeNull();
    expect(row.stockLevel).toBe(STOCK_LEVEL.NORMAL);
    expect(row.unitsSold).toBe(0);
    expect(row.redeemedUnits).toBe(0);
  });

  it("devuelve lista vacia con entradas invalidas", () => {
    expect(normalizeInsightRows(null)).toEqual([]);
    expect(normalizeInsightRows(undefined)).toEqual([]);
  });
});

describe("getInsightTotals", () => {
  it("suma stock, ventas, canjes e importe de todas las sucursales", () => {
    expect(
      getInsightTotals([
        { stock: 2, unitsSold: 7, redeemedUnits: 1, revenue: 100 },
        { stock: 3, unitsSold: 1, redeemedUnits: 2, revenue: 20.5 },
      ])
    ).toEqual({ stock: 5, unitsSold: 8, redeemedUnits: 3, revenue: 120.5 });
  });

  it("ignora valores no numericos y devuelve ceros sin filas", () => {
    expect(getInsightTotals([])).toEqual({
      stock: 0,
      unitsSold: 0,
      redeemedUnits: 0,
      revenue: 0,
    });
    expect(getInsightTotals([{ stock: "x" }]).stock).toBe(0);
  });
});
