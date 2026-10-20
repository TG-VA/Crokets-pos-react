import { describe, it, expect } from "vitest";

import { getRowTypeInfo, formatMovementType } from "./movementFormatters";

describe("movementFormatters - getRowTypeInfo", () => {
  it("marca Venta/canje cuando el ticket tiene canje y cobro (total > 0)", () => {
    const info = getRowTypeInfo({
      movement_type: "sale",
      has_sale_redemption: true,
      sales: { total: 150 },
    });

    expect(info.typeKey).toBe("sale_redemption");
    expect(info.typeLabel).toBe("Venta/canje");
    expect(info.typeFilterKeys).toEqual([
      "sale_redemption",
      "sale",
      "redemption",
    ]);
  });

  it("marca Canje cuando el ticket es solo canje (total = 0)", () => {
    const info = getRowTypeInfo({
      movement_type: "sale",
      has_sale_redemption: true,
      sales: { total: 0 },
    });

    expect(info.typeKey).toBe("redemption");
    expect(info.typeLabel).toBe("Canje");
    expect(info.typeFilterKeys).toEqual(["redemption"]);
  });

  it("marca Canje cuando el total es negativo", () => {
    const info = getRowTypeInfo({
      movement_type: "redemption",
      has_sale_redemption: true,
      sales: { total: -10 },
    });

    expect(info.typeKey).toBe("redemption");
  });

  it("conserva Venta/canje cuando el total no es legible", () => {
    const info = getRowTypeInfo({
      movement_type: "sale",
      has_sale_redemption: true,
    });

    expect(info.typeKey).toBe("sale_redemption");
  });

  it("no marca canje en una venta sin redencion", () => {
    const info = getRowTypeInfo({
      movement_type: "sale",
      has_sale_redemption: false,
      sales: { total: 150 },
    });

    expect(info.typeKey).toBe("sale");
    expect(info.typeLabel).toBe("Venta");
  });

  it("marca Canje directo para un movimiento redemption sin venta", () => {
    const info = getRowTypeInfo({ movement_type: "redemption" });

    expect(info.typeKey).toBe("redemption");
    expect(info.typeLabel).toBe("Canje");
  });

  it("resuelve Ajuste y Entrada", () => {
    expect(getRowTypeInfo({ movement_type: "adjustment" }).typeLabel).toBe(
      "Ajuste"
    );
    expect(getRowTypeInfo({ movement_type: "entry" }).typeLabel).toBe(
      "Entrada"
    );
  });

  it("tolera filas nulas", () => {
    const info = getRowTypeInfo(null);

    expect(info.typeKey).toBe("");
    expect(info.typeFilterKeys).toEqual([]);
  });
});

describe("movementFormatters - formatMovementType", () => {
  it("etiqueta redemption como Canje", () => {
    expect(formatMovementType("redemption")).toBe("Canje");
  });

  it("etiqueta entry como Entrada y transfer como Traspaso", () => {
    expect(formatMovementType("entry")).toBe("Entrada");
    expect(formatMovementType("transfer")).toBe("Traspaso");
  });
});
