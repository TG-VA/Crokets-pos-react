import { describe, it, expect } from "vitest";
import { resolveBranchSalePrice } from "./branchSalePrice";

describe("resolveBranchSalePrice", () => {
  const product = { sale_price: 289 };

  it("usa el catalogo cuando el precio de sucursal es 0", () => {
    expect(resolveBranchSalePrice({ sale_price: 0 }, product)).toBe(289);
    expect(resolveBranchSalePrice({ sale_price: "0.00" }, product)).toBe(289);
  });

  it("respeta un override de sucursal mayor a 0", () => {
    expect(resolveBranchSalePrice({ sale_price: 150 }, product)).toBe(150);
    expect(resolveBranchSalePrice({ sale_price: "150.50" }, product)).toBe(
      150.5
    );
  });

  it("usa el catalogo sin fila o con precio nulo", () => {
    expect(resolveBranchSalePrice(null, product)).toBe(289);
    expect(resolveBranchSalePrice({ sale_price: null }, product)).toBe(289);
    expect(resolveBranchSalePrice({}, product)).toBe(289);
  });

  it("retorna 0 cuando no hay ningun precio valido", () => {
    expect(resolveBranchSalePrice(null, null)).toBe(0);
    expect(
      resolveBranchSalePrice({ sale_price: "x" }, { sale_price: "y" })
    ).toBe(0);
  });
});
