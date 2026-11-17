import { describe, it, expect } from "vitest";

import { resolveStockOriginId } from "./branchScopeCalculationService";

describe("resolveStockOriginId", () => {
  it("usa la sucursal de la terminal operativa e ignora la eleccion", () => {
    expect(resolveStockOriginId({ id: "b1" }, "b2")).toBe("b1");
    expect(
      resolveStockOriginId({ id: "b1", branch_type: "operational" }, "")
    ).toBe("b1");
  });

  it("en una terminal admin usa la sucursal elegida", () => {
    expect(
      resolveStockOriginId({ id: "adm", branch_type: "admin" }, "b2")
    ).toBe("b2");
  });

  it("en una terminal admin no preselecciona origen", () => {
    const admin = { id: "adm", branch_type: "admin" };
    expect(resolveStockOriginId(admin, "")).toBe("");
    expect(resolveStockOriginId(admin, undefined)).toBe("");
  });

  it("sin sucursal devuelve cadena vacia", () => {
    expect(resolveStockOriginId(null, "b2")).toBe("");
  });
});
