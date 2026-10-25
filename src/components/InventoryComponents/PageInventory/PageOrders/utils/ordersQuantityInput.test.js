import { describe, expect, it } from "vitest";

import { sanitizeIntegerQuantity } from "./ordersQuantityInput";

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

  it("drops negative signs and spaces", () => {
    expect(sanitizeIntegerQuantity("-3")).toBe("3");
    expect(sanitizeIntegerQuantity(" 4 ")).toBe("4");
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
