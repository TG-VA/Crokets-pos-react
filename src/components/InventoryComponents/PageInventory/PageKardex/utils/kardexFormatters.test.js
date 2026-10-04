import { describe, it, expect } from "vitest";

import {
  formatKardexCurrency,
  formatKardexOptionalCurrency,
} from "./kardexFormatters";

describe("formatKardexOptionalCurrency", () => {
  it("formatea un importe positivo con el formato de moneda del kardex", () => {
    expect(formatKardexOptionalCurrency(120.5)).toBe(
      formatKardexCurrency(120.5)
    );
    expect(formatKardexOptionalCurrency(120.5)).toContain("$");
  });

  it("acepta importes numericos enviados como texto", () => {
    expect(formatKardexOptionalCurrency("240")).toBe(formatKardexCurrency(240));
  });

  it("devuelve guion cuando el importe no aplica", () => {
    expect(formatKardexOptionalCurrency(null)).toBe("—");
    expect(formatKardexOptionalCurrency(undefined)).toBe("—");
    expect(formatKardexOptionalCurrency("")).toBe("—");
  });

  it("devuelve guion cuando el importe es cero, negativo o no numerico", () => {
    expect(formatKardexOptionalCurrency(0)).toBe("—");
    expect(formatKardexOptionalCurrency("0")).toBe("—");
    expect(formatKardexOptionalCurrency(-15)).toBe("—");
    expect(formatKardexOptionalCurrency("sin-dato")).toBe("—");
    expect(formatKardexOptionalCurrency(NaN)).toBe("—");
    expect(formatKardexOptionalCurrency(Infinity)).toBe("—");
  });
});
