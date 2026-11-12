import { describe, it, expect } from "vitest";
import {
  KIT_MARGIN_WARNING,
  getKitMarginWarning,
} from "./kitMarginCalculationService";

const components = [
  { sale_price: 100, cost_price: 60, quantity: 2 },
  { sale_price: 50, cost_price: 20, quantity: 1 },
];
// Suma de venta: 250. Suma de costo: 140.

describe("getKitMarginWarning", () => {
  it("sin aviso cuando el precio queda entre costo y suma de venta", () => {
    expect(getKitMarginWarning(components, 200)).toBeNull();
    expect(getKitMarginWarning(components, 140)).toBeNull();
  });

  it("avisa sin descuento cuando el precio iguala o supera la suma de venta", () => {
    expect(getKitMarginWarning(components, 250)).toBe(
      KIT_MARGIN_WARNING.NO_DISCOUNT
    );
    expect(getKitMarginWarning(components, 300)).toBe(
      KIT_MARGIN_WARNING.NO_DISCOUNT
    );
  });

  it("avisa venta a perdida cuando el precio es menor que el costo", () => {
    expect(getKitMarginWarning(components, 139.99)).toBe(
      KIT_MARGIN_WARNING.BELOW_COST
    );
  });

  it("sin componentes o sin precio no avisa", () => {
    expect(getKitMarginWarning([], 100)).toBeNull();
    expect(getKitMarginWarning(null, 100)).toBeNull();
    expect(getKitMarginWarning(components, 0)).toBeNull();
    expect(getKitMarginWarning(components, Number.NaN)).toBeNull();
  });
});
