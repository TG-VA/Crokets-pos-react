import { describe, it, expect } from "vitest";
import { normalizeUsername } from "./_shared/normalizeUsername.ts";

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
