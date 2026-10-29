import { describe, it, expect } from "vitest";
import { normalizeUsername, isValidUsername } from "./_shared/normalizeUsername.ts";

describe("normalizeUsername", () => {
  it("convierte a minusculas y quita espacios de los extremos", () => {
    expect(normalizeUsername("  CARLOS  ")).toBe("carlos");
    expect(normalizeUsername("Gael")).toBe("gael");
  });

  it("trata los comodines de LIKE como texto literal", () => {
    expect(normalizeUsername("*")).toBe("*");
    expect(normalizeUsername("C*")).toBe("c*");
    expect(normalizeUsername("100%")).toBe("100%");
    expect(normalizeUsername("a_b")).toBe("a_b");
    expect(normalizeUsername("x\\y")).toBe("x\\y");
  });

  it("devuelve cadena vacia para entradas ausentes o en blanco", () => {
    expect(normalizeUsername(undefined)).toBe("");
    expect(normalizeUsername(null)).toBe("");
    expect(normalizeUsername("   ")).toBe("");
  });
});

describe("isValidUsername", () => {
  it("acepta letras minusculas ASCII, numeros, punto, guion y guion bajo", () => {
    expect(isValidUsername("carlos")).toBe(true);
    expect(isValidUsername("ana_maria.2-b")).toBe(true);
  });

  it("rechaza espacios internos, comodines y vacio", () => {
    expect(isValidUsername("ana maria")).toBe(false);
    expect(isValidUsername("a*")).toBe(false);
    expect(isValidUsername("100%")).toBe(false);
    expect(isValidUsername("")).toBe(false);
  });

  it("rechaza caracteres no ASCII cuyo lower() difiere entre JS y PostgreSQL", () => {
    expect(isValidUsername("\u0130stanbul".toLowerCase())).toBe(false);
    expect(isValidUsername("jos\u00e9")).toBe(false);
  });
});
