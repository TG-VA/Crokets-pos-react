import { describe, it, expect } from "vitest";

import { buildCostSummary, formatCurrency } from "./inventoryAddFormatters";

describe("buildCostSummary", () => {
  it("reporta el cambio de CPP con ambos importes", () => {
    const summary = buildCostSummary({
      previousCostPrice: 250,
      costPrice: 253.33,
    });

    expect(summary).toBe(
      `CPP: de ${formatCurrency(250)} a ${formatCurrency(253.33)}`
    );
  });

  it("reporta sin cambio cuando el CPP es el mismo", () => {
    expect(buildCostSummary({ previousCostPrice: 250, costPrice: 250 })).toBe(
      `CPP sin cambio: ${formatCurrency(250)}`
    );
  });

  it("compara los importes redondeados, no los crudos", () => {
    expect(
      buildCostSummary({ previousCostPrice: 100.005, costPrice: 100.01 })
    ).toBe(`CPP sin cambio: ${formatCurrency(100.01)}`);
  });
});
