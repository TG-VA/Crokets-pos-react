import { describe, it, expect } from "vitest";

import { fmt, getFolio, getCancunDateValue } from "./cashCutFormatters";

describe("cashCutFormatters", () => {
  describe("fmt", () => {
    it("formatea un monto en pesos", () => {
      expect(fmt(1234.5)).toContain("1,234.50");
    });

    it("trata valores nulos como cero", () => {
      expect(fmt(null)).toContain("0.00");
      expect(fmt(undefined)).toContain("0.00");
    });
  });

  describe("getFolio", () => {
    it("toma los primeros 8 caracteres en mayusculas", () => {
      expect(getFolio("abcdef123456")).toBe("#ABCDEF12");
    });

    it("devuelve un guion cuando no hay id", () => {
      expect(getFolio(null)).toBe("—");
    });
  });

  describe("getCancunDateValue", () => {
    it("usa la fecha de Cancun y no la de UTC", () => {
      expect(getCancunDateValue("2026-09-16T02:00:00.000Z")).toBe("2026-09-15");
      expect(getCancunDateValue("2026-09-16T06:00:00.000Z")).toBe("2026-09-16");
    });
  });
});
