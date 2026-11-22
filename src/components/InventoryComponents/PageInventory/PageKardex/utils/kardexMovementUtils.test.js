import { describe, expect, it } from "vitest";

import {
  getKardexStockStatus,
  sortKardexMovementsByDateDesc,
} from "./kardexMovementUtils";

describe("getKardexStockStatus", () => {
  const statusKey = (overrides) =>
    getKardexStockStatus({
      currentStock: 10,
      minimumStock: 5,
      maximumStock: 0,
      ...overrides,
    }).key;

  it("marca stock bajo cuando el stock es igual al minimo", () => {
    expect(getKardexStockStatus({ currentStock: 5, minimumStock: 5 })).toEqual({
      key: "lowStock",
      label: "STOCK BAJO",
    });
  });

  it("marca agotado con stock 0 o negativo", () => {
    expect(statusKey({ currentStock: 0 })).toBe("outOfStock");
    expect(statusKey({ currentStock: -2 })).toBe("outOfStock");
  });

  it("sin minimo un stock positivo queda disponible", () => {
    expect(statusKey({ currentStock: 1, minimumStock: 0 })).toBe("available");
  });

  it("no inventa un umbral por encima del minimo", () => {
    expect(statusKey({ currentStock: 6, minimumStock: 5 })).toBe("available");
  });

  it("reporta sin inventario cuando el producto no lo controla", () => {
    expect(statusKey({ currentStock: 0, tracksInventory: false })).toBe(
      "noInventory"
    );
  });

  it("marca sobrestock solo con maximo configurado", () => {
    expect(statusKey({ currentStock: 20, maximumStock: 15 })).toBe("overstock");
    expect(statusKey({ currentStock: 20, maximumStock: 0 })).toBe("available");
  });
});

describe("sortKardexMovementsByDateDesc", () => {
  it("ordena por fecha descendente, desempata por id y deja sin fecha al final", () => {
    const sorted = sortKardexMovementsByDateDesc([
      { id: "a", created_at: "2026-03-01T10:00:00.000Z" },
      { id: "x", created_at: null },
      { id: "b", created_at: "2026-03-01T10:00:00.000Z" },
      { id: "c", created_at: "2026-03-02T10:00:00.000Z" },
    ]);

    expect(sorted.map((row) => row.id)).toEqual(["c", "b", "a", "x"]);
  });
});
