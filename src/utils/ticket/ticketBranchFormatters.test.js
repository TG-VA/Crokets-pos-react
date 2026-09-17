import { describe, it, expect } from "vitest";

import {
  formatStateShort,
  extractPostalCode,
  removePostalCode,
  normalizeAddressLine1,
  formatBranchAddressLines,
} from "./ticketBranchFormatters";

describe("ticketBranchFormatters", () => {
  describe("formatStateShort", () => {
    it("acorta los estados conocidos", () => {
      expect(formatStateShort("quintana roo")).toBe("QROO");
      expect(formatStateShort("Quintana Roo")).toBe("QROO");
      expect(formatStateShort("CIUDAD DE MEXICO")).toBe("CDMX");
      expect(formatStateShort("estado de mexico")).toBe("EDOMEX");
      expect(formatStateShort("nuevo leon")).toBe("NL");
    });

    it("devuelve el estado tal cual si no es conocido", () => {
      expect(formatStateShort("Yucatán")).toBe("YUCATÁN");
      expect(formatStateShort("")).toBe("");
    });
  });

  describe("extractPostalCode", () => {
    it("extrae un codigo postal de cinco digitos", () => {
      expect(extractPostalCode("Av. Principal 123, CP 77500 Cancún")).toBe("77500");
      expect(extractPostalCode("sin codigo")).toBe("");
      expect(extractPostalCode("")).toBe("");
    });
  });

  describe("removePostalCode", () => {
    it("elimina codigos postales del address", () => {
      expect(removePostalCode("Calle 5 77500 Mérida")).toBe("Calle 5  Mérida");
      expect(removePostalCode("Sin codigo")).toBe("Sin codigo");
    });
  });

  describe("normalizeAddressLine1", () => {
    it("limpia comas, guiones y unidades de direccion", () => {
      expect(normalizeAddressLine1("Cra. 4 # 12-34")).toBe("CRA. 4 # 12 34");
      expect(normalizeAddressLine1("Mza. 12 Lote 5")).toBe("MZ 12 LT 5");
      expect(normalizeAddressLine1("manzana 3 lote 4")).toBe("MZ 3 LT 4");
      expect(normalizeAddressLine1("Av. Principal 77500")).toBe("AV. PRINCIPAL");
    });
  });

  describe("formatBranchAddressLines", () => {
    it("arma dos lineas con direccion, ciudad, estado y CP", () => {
      const lines = formatBranchAddressLines({
        address: "Av. Principal 123",
        city: "cancun",
        state: "quintana roo",
        postal_code: "77500",
      });

      expect(lines).toEqual([
        "AV. PRINCIPAL 123",
        "CANCUN, QROO CP 77500",
      ]);
    });

    it("ajusta a lineas vacias sin datos", () => {
      expect(formatBranchAddressLines({})).toEqual([]);
    });
  });
});
