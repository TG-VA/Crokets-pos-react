import { describe, it, expect } from "vitest";
import {
  sanitizeIntegerInput,
  sanitizeDecimalInput,
} from "./kitInputSanitizers";

describe("sanitizeIntegerInput", () => {
  it("elimina todo lo que no sea digito", () => {
    expect(sanitizeIntegerInput("1a2.5-")).toBe("125");
  });

  it("tolera valores nulos", () => {
    expect(sanitizeIntegerInput(null)).toBe("");
    expect(sanitizeIntegerInput(undefined)).toBe("");
  });
});

describe("sanitizeDecimalInput", () => {
  it("conserva un solo punto y dos decimales", () => {
    expect(sanitizeDecimalInput("12.345")).toBe("12.34");
    expect(sanitizeDecimalInput("1.2.3")).toBe("1.23");
  });

  it("elimina letras y signos", () => {
    expect(sanitizeDecimalInput("-a9,5")).toBe("95");
  });

  it("permite el punto final mientras se escribe", () => {
    expect(sanitizeDecimalInput("10.")).toBe("10.");
  });
});
