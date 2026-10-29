import { describe, it, expect } from "vitest";
import { isNamedCustomer } from "./publicCustomerService";

describe("isNamedCustomer", () => {
  it.each(["Ana", "Juan Perez", "  Beto  "])("acepta %j", (name) => {
    expect(isNamedCustomer(name)).toBe(true);
  });

  it.each([
    "PÚBLICO EN GENERAL",
    "publico en general",
    "  Público En General ",
    "",
    "   ",
    null,
    undefined,
  ])("rechaza %j", (name) => {
    expect(isNamedCustomer(name)).toBe(false);
  });
});
