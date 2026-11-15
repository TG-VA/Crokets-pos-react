import { describe, it, expect } from "vitest";

import { findProductByCodigo } from "./productLookupCalculationService";

const products = [
  { id: "p1", codigo: "750" },
  { id: "p2", codigo: " 800 " },
];

describe("findProductByCodigo", () => {
  it("encuentra por codigo exacto ignorando espacios", () => {
    expect(findProductByCodigo(products, " 750 ")?.id).toBe("p1");
    expect(findProductByCodigo(products, "800")?.id).toBe("p2");
  });

  it("devuelve null sin codigo, sin coincidencia o sin lista", () => {
    expect(findProductByCodigo(products, "")).toBeNull();
    expect(findProductByCodigo(products, null)).toBeNull();
    expect(findProductByCodigo(products, "999")).toBeNull();
    expect(findProductByCodigo(null, "750")).toBeNull();
  });
});
