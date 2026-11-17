import { describe, expect, it } from "vitest";

import {
  sanitizeCostInput,
  sanitizeIntegerQuantity,
} from "./ordersQuantityInput";

describe("sanitizeIntegerQuantity", () => {
  it("keeps digits only", () => {
    expect(sanitizeIntegerQuantity("12")).toBe("12");
    expect(sanitizeIntegerQuantity("1a2b")).toBe("12");
  });

  it("keeps only the integer part of decimal input", () => {
    expect(sanitizeIntegerQuantity("2.5")).toBe("2");
    expect(sanitizeIntegerQuantity("2,5")).toBe("2");
    expect(sanitizeIntegerQuantity("2.")).toBe("2");
    expect(sanitizeIntegerQuantity(".5")).toBe("");
  });

  it("discards a negative capture instead of flipping its sign", () => {
    expect(sanitizeIntegerQuantity("-3")).toBe("");
    expect(sanitizeIntegerQuantity(" -3 ")).toBe("");
    expect(sanitizeIntegerQuantity("\u22123")).toBe("");
  });

  it("drops spaces and non numeric noise", () => {
    expect(sanitizeIntegerQuantity(" 4 ")).toBe("4");
    expect(sanitizeIntegerQuantity("1 2")).toBe("12");
  });

  it("removes leading zeros but keeps a single zero", () => {
    expect(sanitizeIntegerQuantity("007")).toBe("7");
    expect(sanitizeIntegerQuantity("0")).toBe("0");
    expect(sanitizeIntegerQuantity("000")).toBe("0");
  });

  it("returns an empty string for empty or non numeric values", () => {
    expect(sanitizeIntegerQuantity("")).toBe("");
    expect(sanitizeIntegerQuantity(null)).toBe("");
    expect(sanitizeIntegerQuantity(undefined)).toBe("");
    expect(sanitizeIntegerQuantity("abc")).toBe("");
  });
});

describe("sanitizeCostInput", () => {
  it("acepta enteros y hasta dos decimales", () => {
    expect(sanitizeCostInput("120")).toBe("120");
    expect(sanitizeCostInput("45.5")).toBe("45.5");
    expect(sanitizeCostInput(" 9.99 ")).toBe("9.99");
  });

  it("toma la coma como punto decimal", () => {
    expect(sanitizeCostInput("98,5")).toBe("98.5");
  });

  it("devuelve cadena vacia al borrar el campo", () => {
    expect(sanitizeCostInput("")).toBe("");
    expect(sanitizeCostInput(null)).toBe("");
  });

  it("rechaza signo, letras y un tercer decimal", () => {
    expect(sanitizeCostInput("-5")).toBeNull();
    expect(sanitizeCostInput("12a")).toBeNull();
    expect(sanitizeCostInput("1.234")).toBeNull();
  });

  it("acepta el tope y rechaza costos mayores a RECEIPT_COST_MAX", () => {
    expect(sanitizeCostInput("1000000")).toBe("1000000");
    expect(sanitizeCostInput("1000000.01")).toBeNull();
    expect(sanitizeCostInput("2000000")).toBeNull();
  });
});
