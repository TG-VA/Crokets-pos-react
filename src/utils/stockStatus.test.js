import { describe, expect, it } from "vitest";

import { getStockLevel, getStockStatus } from "./stockStatus";

describe("getStockLevel", () => {
  it("marca agotado con stock 0", () => {
    expect(getStockLevel({ stock: 0, minimum: 5 })).toBe("outOfStock");
  });

  it("marca agotado con stock negativo", () => {
    expect(getStockLevel({ stock: -3, minimum: 0 })).toBe("outOfStock");
  });

  it("marca stock bajo cuando el stock es igual al minimo", () => {
    expect(getStockLevel({ stock: 5, minimum: 5 })).toBe("lowStock");
  });

  it("marca disponible cuando el stock supera el minimo", () => {
    expect(getStockLevel({ stock: 6, minimum: 5 })).toBe("available");
  });

  it("sin minimo nunca marca stock bajo", () => {
    expect(getStockLevel({ stock: 1, minimum: 0 })).toBe("available");
  });

  it("trata valores no numericos como 0", () => {
    expect(getStockLevel({ stock: null, minimum: "abc" })).toBe("outOfStock");
  });
});

describe("getStockStatus", () => {
  const row = { existencia: 5, min: 5, tracksInventory: true };

  it("usa las reglas comunes sobre la fila del reporte", () => {
    expect(getStockStatus(row)).toEqual({
      type: "lowStock",
      label: "Stock bajo",
    });
    expect(getStockStatus({ ...row, existencia: 0 }).type).toBe("outOfStock");
    expect(getStockStatus({ ...row, existencia: 6 }).type).toBe("available");
  });

  it("no aplica a productos sin inventario o sin existencia", () => {
    expect(getStockStatus({ ...row, tracksInventory: false }).type).toBe(
      "notApplicable"
    );
    expect(getStockStatus({ ...row, existencia: null }).type).toBe(
      "notApplicable"
    );
  });

  it("reporta el producto sin registro en la sucursal", () => {
    expect(getStockStatus({ ...row, noBranchRecord: true }).type).toBe(
      "noBranchRecord"
    );
  });
});
