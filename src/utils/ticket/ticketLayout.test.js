import { describe, it, expect } from "vitest";

import {
  TICKET_WIDTH,
  separator,
  strongSeparator,
  centerText,
  money,
  normalizeSpaces,
  normalizeUpper,
  wrapText,
  padRight,
  padLeft,
  formatItemLine,
  formatTotalLine,
  pushItemDetailLines,
} from "./ticketLayout";

describe("ticketLayout", () => {
  describe("separator", () => {
    it("repite el ancho del ticket", () => {
      expect(separator()).toBe("-".repeat(TICKET_WIDTH));
      expect(strongSeparator()).toBe("=".repeat(TICKET_WIDTH));
      expect(separator("*")).toBe("*".repeat(TICKET_WIDTH));
    });
  });

  describe("centerText", () => {
    it("centra el texto en el ancho del ticket", () => {
      expect(centerText("CROKETS")).toBe("            CROKETS             ");
      expect(centerText("A", 4)).toBe(" A  ");
    });

    it("devuelve tal cual si el texto es mas ancho que el ticket", () => {
      const long = "X".repeat(TICKET_WIDTH + 1);
      expect(centerText(long)).toBe(long);
    });

    it("trata valores nulos como texto vacio", () => {
      expect(centerText(null)).toBe(" ".repeat(TICKET_WIDTH));
    });
  });

  describe("money", () => {
    it("formatea con dos decimales y signo de pesos", () => {
      expect(money(1234.5)).toBe("$1234.50");
    });

    it("trata valores nulos como cero", () => {
      expect(money(null)).toBe("$0.00");
      expect(money(undefined)).toBe("$0.00");
    });
  });

  describe("normalizeSpaces / normalizeUpper", () => {
    it("colapsa espacios y recorta", () => {
      expect(normalizeSpaces("  hola   mundo ")).toBe("hola mundo");
      expect(normalizeUpper("  hola   mundo ")).toBe("HOLA MUNDO");
    });
  });

  describe("wrapText", () => {
    it("parte por palabras dentro del ancho", () => {
      expect(wrapText("uno dos tres", 7)).toEqual(["uno dos", "tres"]);
    });

    it("rompe palabras mas largas que el ancho", () => {
      expect(wrapText("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
    });

    it("devuelve [\"\"] para texto vacio", () => {
      expect(wrapText("")).toEqual([""]);
      expect(wrapText("   ")).toEqual([""]);
    });
  });

  describe("padRight / padLeft", () => {
    it("agrega espacios a la izquierda o derecha", () => {
      expect(padRight("abc", 5)).toBe("abc  ");
      expect(padLeft("abc", 5)).toBe("  abc");
    });

    it("trunca si el texto excede el ancho", () => {
      expect(padRight("abcdef", 4)).toBe("abcd");
      expect(padLeft("abcdef", 4)).toBe("abcd");
    });
  });

  describe("formatItemLine", () => {
    it("compone la linea de item con columnas fijas", () => {
      const line = formatItemLine("2", "SNACK", "40.00");
      expect(line.length).toBe(TICKET_WIDTH);
      expect(line).toBe("2    SNACK                 40.00");
    });
  });

  describe("formatTotalLine", () => {
    it("alinea la etiqueta a la izquierda y el valor a la derecha", () => {
      const line = formatTotalLine("TOTAL:", "$232.00");
      expect(line).toBe("TOTAL:                   $232.00");
    });
  });

  describe("pushItemDetailLines", () => {
    it("agrega lineas con indentacion de cinco espacios", () => {
      const lines = [];
      pushItemDetailLines(lines, "P.U. $80.00");
      expect(lines).toEqual(["     P.U. $80.00"]);
    });
  });
});
