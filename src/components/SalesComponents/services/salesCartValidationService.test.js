import { describe, it, expect } from "vitest";
import { validateProductForCart } from "./salesCartValidationService";

describe("validateProductForCart precio de sucursal", () => {
  const product = {
    id: "p1",
    tracks_inventory: true,
    sale_price: 289,
    cost_price: 197,
  };
  const withRow = (row) => ({
    product,
    getKitAvailableStock: async () => ({ isValid: true, availableStock: 1 }),
    getBranchInventoryRow: async () => row,
  });
  const baseRow = { stock: 3, has_been_stocked: true, is_active: true };

  it("usa el precio del catalogo cuando la sucursal tiene 0", async () => {
    const result = await validateProductForCart(
      withRow({ ...baseRow, sale_price: 0, cost_price: 197 })
    );
    expect(result.isValid).toBe(true);
    expect(result.salePrice).toBe(289);
  });

  it("respeta un override de sucursal mayor a 0", async () => {
    const result = await validateProductForCart(
      withRow({ ...baseRow, sale_price: 150, cost_price: 197 })
    );
    expect(result.salePrice).toBe(150);
  });
});
