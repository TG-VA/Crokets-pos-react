import { describe, it, expect, vi } from "vitest";

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

import { getProductSalePrice } from "./productDiscountService";

describe("getProductSalePrice", () => {
  const product = { id: "p1", sale_price: 289 };

  it("usa el catalogo cuando la fila de sucursal esta en 0", () => {
    expect(getProductSalePrice(product, { p1: { sale_price: 0 } })).toBe(289);
  });

  it("respeta un precio de sucursal mayor a 0", () => {
    expect(getProductSalePrice(product, { p1: { sale_price: 150 } })).toBe(150);
  });

  it("usa el catalogo sin fila de sucursal", () => {
    expect(getProductSalePrice(product, {})).toBe(289);
  });
});
