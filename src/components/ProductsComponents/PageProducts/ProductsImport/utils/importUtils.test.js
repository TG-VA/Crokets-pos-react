import { describe, it, expect } from "vitest";
import {
  normalizeText,
  normalizeHeader,
  parseBoolean,
  parseNumber,
  formatCurrency,
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
  TEMPLATE_COLUMNS,
  SALE_TYPES,
  UNITS,
  IVA_VALUES,
} from "./importUtils";

describe("importUtils", () => {
  describe("normalizeText", () => {
    it("recorta, convierte a minúsculas y elimina acentos", () => {
      expect(normalizeText("  CROQUETA ÁÉÍÓÚ  ")).toBe("croqueta aeiou");
    });

    it("maneja valores nulos e indefinidos como string vacío", () => {
      expect(normalizeText(null)).toBe("");
      expect(normalizeText(undefined)).toBe("");
    });
  });

  describe("normalizeHeader", () => {
    it("normaliza y colapsa espacios consecutivos", () => {
      expect(normalizeHeader("  Usa   Inventario ")).toBe("usa inventario");
    });
  });

  describe("parseBoolean", () => {
    it("reconoce valores verdaderos", () => {
      ["true", "SI", "sí", "1", "yes", "Y"].forEach((value) => {
        expect(parseBoolean(value)).toBe(true);
      });
    });

    it("reconoce valores falsos", () => {
      ["false", "no", "0", "N"].forEach((value) => {
        expect(parseBoolean(value)).toBe(false);
      });
    });

    it("devuelve null para valores no reconocidos", () => {
      expect(parseBoolean("quizás")).toBeNull();
      expect(parseBoolean("")).toBeNull();
      expect(parseBoolean(null)).toBeNull();
    });
  });

  describe("parseNumber", () => {
    it("limpia símbolos de moneda, comas y porcentajes", () => {
      expect(parseNumber("$1,234.50")).toBe(1234.5);
      expect(parseNumber("10%")).toBe(10);
    });

    it("convierte números y strings numéricos", () => {
      expect(parseNumber(25)).toBe(25);
      expect(parseNumber("12")).toBe(12);
    });

    it("devuelve null para vacíos, nulos e inválidos", () => {
      expect(parseNumber(null)).toBeNull();
      expect(parseNumber(undefined)).toBeNull();
      expect(parseNumber("")).toBeNull();
      expect(parseNumber("abc")).toBeNull();
      expect(parseNumber("12..5")).toBeNull();
    });
  });

  describe("formatCurrency", () => {
    it("formatea en pesos mexicanos", () => {
      expect(formatCurrency(1234.5)).toContain("1,234.50");
    });

    it("usa 0 como valor por defecto", () => {
      expect(formatCurrency(null)).toContain("0.00");
      expect(formatCurrency(undefined)).toContain("0.00");
    });
  });

  it("expone columnas y catálogos esperados", () => {
    expect(REQUIRED_COLUMNS).toContain("Código");
    expect(REQUIRED_COLUMNS).toContain("Usa inventario");
    expect(OPTIONAL_COLUMNS).toContain("Departamento");
    expect(OPTIONAL_COLUMNS).toContain("Clave SAT");
    expect(TEMPLATE_COLUMNS).toHaveLength(
      REQUIRED_COLUMNS.length + OPTIONAL_COLUMNS.length
    );
    expect(SALE_TYPES).toEqual(["unidad", "granel"]);
    expect(UNITS).toContain("servicio");
    expect(IVA_VALUES).toEqual([0, 8, 16]);
  });
});
