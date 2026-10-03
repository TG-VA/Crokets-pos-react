import { describe, it, expect } from "vitest";

import {
  ENTRY_MODE,
  getCurrentStock,
  getCurrentUnitCost,
  projectIncomingCost,
  suggestIncomingCostInput,
} from "./inventoryAddProjectionService";

const makeProduct = (overrides = {}) => ({
  product_id: "prod-1",
  codigo: "7501",
  descripcion: "Alimento",
  existencia: 10,
  costo: 100,
  precio: 250,
  ...overrides,
});

describe("getCurrentStock", () => {
  it("normaliza la existencia del producto", () => {
    expect(getCurrentStock(makeProduct({ existencia: "7" }))).toBe(7);
    expect(getCurrentStock(makeProduct({ existencia: -3 }))).toBe(0);
    expect(getCurrentStock(makeProduct({ existencia: null }))).toBe(0);
    expect(getCurrentStock(null)).toBe(0);
  });
});

describe("getCurrentUnitCost", () => {
  it("lee el costo vigente que ya trae el producto de la sucursal", () => {
    expect(getCurrentUnitCost(makeProduct({ costo: 250 }))).toBe(250);
  });

  it("respeta un costo ya calculado en 0 frente al campo alterno", () => {
    expect(getCurrentUnitCost(makeProduct({ costo: 0, cost_price: 90 }))).toBe(
      0
    );
  });

  it("hereda el catalogo cuando el producto no expone costo de sucursal", () => {
    expect(getCurrentUnitCost({ product_id: "p", cost_price: 60 })).toBe(60);
    expect(getCurrentUnitCost(null)).toBe(0);
  });
});

describe("suggestIncomingCostInput", () => {
  it("precarga el costo vigente con dos decimales", () => {
    expect(suggestIncomingCostInput(100)).toBe("100.00");
    expect(suggestIncomingCostInput(233.33)).toBe("233.33");
    expect(suggestIncomingCostInput(0)).toBe("0.00");
  });

  it("deviene texto vacio ante un costo no numerico", () => {
    expect(suggestIncomingCostInput("abc")).toBe("");
    expect(suggestIncomingCostInput(NaN)).toBe("");
    expect(suggestIncomingCostInput(Infinity)).toBe("");
  });

  it("precarga 0.00 cuando el producto no tiene costo en ninguna parte", () => {
    // `null` colapsa a 0 igual que `resolveCurrentCost`, de modo que el campo
    // queda en cero y la validacion de "compra sin costo" no lo confunde con un
    // campo vacio.
    expect(suggestIncomingCostInput(null)).toBe("0.00");
    // `undefined` si es NaN y cae al texto vacio. La rama no es alcanzable desde
    // la interfaz porque `getCurrentUnitCost` siempre devuelve un numero; se fija
    // para que el comportamiento no cambie por accidente.
    expect(suggestIncomingCostInput(undefined)).toBe("");
  });
});

describe("projectIncomingCost: modo compra", () => {
  it("proyecta el CPP ponderado de 10 @ 100 mas 10 @ 400", () => {
    const projection = projectIncomingCost({
      product: makeProduct(),
      quantity: 10,
      entryMode: ENTRY_MODE.PURCHASE,
      incomingCostPrice: 400,
    });

    expect(projection.isPurchase).toBe(true);
    expect(projection.currentStock).toBe(10);
    expect(projection.currentCost).toBe(100);
    expect(projection.incomingQty).toBe(10);
    expect(projection.resolvedIncomingCost).toBe(400);
    expect(projection.projectedStock).toBe(20);
    expect(projection.projectedCost).toBe(250);
    expect(projection.totalIncomingCost).toBe(4000);
    expect(projection.currentInventoryValue).toBe(1000);
    expect(projection.projectedInventoryValue).toBe(5000);
    expect(projection.costWillChange).toBe(true);
  });

  it("proyecta el CPP cuando el lote entra por debajo del costo vigente", () => {
    const projection = projectIncomingCost({
      product: makeProduct(),
      quantity: 10,
      entryMode: ENTRY_MODE.PURCHASE,
      incomingCostPrice: 50,
    });

    // ((10*100) + (10*50)) / 20 = 75
    expect(projection.projectedCost).toBe(75);
    expect(projection.costWillChange).toBe(true);
  });

  it("redondea a 2 decimales igual que el servicio que persistira", () => {
    const projection = projectIncomingCost({
      product: makeProduct(),
      quantity: 3,
      entryMode: ENTRY_MODE.PURCHASE,
      incomingCostPrice: 33.333,
    });

    // (1000 + 99.99) / 13 = 84.61
    expect(projection.resolvedIncomingCost).toBe(33.33);
    expect(projection.projectedCost).toBe(84.61);
  });

  it("deja el CPP intacto cuando la compra se hace al costo vigente", () => {
    const projection = projectIncomingCost({
      product: makeProduct(),
      quantity: 25,
      entryMode: ENTRY_MODE.PURCHASE,
      incomingCostPrice: 100,
    });

    expect(projection.projectedCost).toBe(100);
    expect(projection.costWillChange).toBe(false);
  });

  it("toma el costo del lote cuando no hay stock previo", () => {
    const projection = projectIncomingCost({
      product: makeProduct({ existencia: 0 }),
      quantity: 8,
      entryMode: ENTRY_MODE.PURCHASE,
      incomingCostPrice: 175.5,
    });

    expect(projection.projectedCost).toBe(175.5);
  });
});

describe("projectIncomingCost: modo entrada manual", () => {
  it("no mueve el CPP aunque el campo de costo traiga un numero", () => {
    const projection = projectIncomingCost({
      product: makeProduct(),
      quantity: 10,
      entryMode: ENTRY_MODE.MANUAL,
      incomingCostPrice: 400,
    });

    // El costo de compra no viaja en modo manual: el lote entra a 100 y el
    // promedio ((10*100)+(10*100))/20 se queda en 100.
    expect(projection.isPurchase).toBe(false);
    expect(projection.resolvedIncomingCost).toBe(100);
    expect(projection.projectedCost).toBe(100);
    expect(projection.costWillChange).toBe(false);
    expect(projection.projectedStock).toBe(20);
  });

  it("ignora el costo capturado al cambiar a compra sin volver a capturar", () => {
    const manual = projectIncomingCost({
      product: makeProduct(),
      quantity: 10,
      entryMode: ENTRY_MODE.MANUAL,
      incomingCostPrice: 400,
    });

    const purchase = projectIncomingCost({
      product: makeProduct(),
      quantity: 10,
      entryMode: ENTRY_MODE.PURCHASE,
      incomingCostPrice: 400,
    });

    expect(manual.projectedCost).toBe(100);
    expect(purchase.projectedCost).toBe(250);
  });
});

describe("projectIncomingCost: bordes", () => {
  it("mantiene el CPP vigente sin cantidad capturada", () => {
    for (const quantity of ["", null, undefined, 0, "abc", -5]) {
      const projection = projectIncomingCost({
        product: makeProduct(),
        quantity,
        entryMode: ENTRY_MODE.PURCHASE,
        incomingCostPrice: 400,
      });

      expect(projection.incomingQty).toBe(0);
      expect(projection.projectedCost).toBe(100);
      expect(projection.projectedStock).toBe(10);
      expect(projection.totalIncomingCost).toBe(0);
      expect(projection.costWillChange).toBe(false);
    }
  });

  it("no propaga NaN desde un costo de compra sucio", () => {
    for (const incomingCostPrice of ["cuatrocientos", null, undefined, NaN]) {
      const projection = projectIncomingCost({
        product: makeProduct(),
        quantity: 10,
        entryMode: ENTRY_MODE.PURCHASE,
        incomingCostPrice,
      });

      expect(Number.isFinite(projection.projectedCost)).toBe(true);
      expect(projection.projectedCost).toBe(100);
    }
  });

  it("acepta cantidades fraccionadas sin redondear el stock", () => {
    const projection = projectIncomingCost({
      product: makeProduct({ existencia: 2.5 }),
      quantity: 1.5,
      entryMode: ENTRY_MODE.PURCHASE,
      incomingCostPrice: 20,
    });

    expect(projection.projectedStock).toBe(4);
    expect(projection.resolvedIncomingCost).toBe(20);
    expect(projection.totalIncomingCost).toBe(30);
  });

  it("es tolerante a invocarse sin argumentos", () => {
    const projection = projectIncomingCost();

    expect(projection.currentStock).toBe(0);
    expect(projection.currentCost).toBe(0);
    expect(projection.projectedCost).toBe(0);
    expect(projection.entryMode).toBe(ENTRY_MODE.MANUAL);
  });
});
