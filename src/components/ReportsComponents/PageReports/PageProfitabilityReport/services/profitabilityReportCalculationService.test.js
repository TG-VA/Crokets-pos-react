import { describe, it, expect } from "vitest";

import {
  COST_SOURCE,
  aggregateProductsProfitability,
  resolveSaleDetailUnitCost,
} from "./profitabilityReportCalculationService";

const BRANCH_ID = "branch-1";

/**
 * Arma el contexto minimo de `aggregateProductsProfitability` con una sola
 * partida de venta, que es el escenario que fija la resolucion de costo.
 */
const buildContext = ({
  saleDetails,
  branchInventoryMap = {},
  productsMap = {},
  kitsMap = {},
} = {}) => {
  const salesMap = {};
  const saleIds = [];

  for (const detail of saleDetails) {
    if (!salesMap[detail.sale_id]) {
      salesMap[detail.sale_id] = {
        id: detail.sale_id,
        branch_id: BRANCH_ID,
      };
      saleIds.push(detail.sale_id);
    }
  }

  return aggregateProductsProfitability({
    saleDetails,
    salesMap,
    branchInventoryMap,
    productsMap,
    departmentsMap: { dep1: { id: "dep1", name: "Alimentos" } },
    kitsMap,
  });
};

const regularDetail = (overrides = {}) => ({
  id: "sd-1",
  sale_id: "sale-1",
  product_id: "prod-1",
  quantity: 2,
  unit_price: 250,
  discount_amount: 0,
  total_price: 500,
  cost_price: 0,
  products: { id: "prod-1", name: "Alimento", barcode: "7501" },
  ...overrides,
});

describe("resolveSaleDetailUnitCost", () => {
  it("prioriza el snapshot congelado sobre el inventario de la sucursal", () => {
    const resolved = resolveSaleDetailUnitCost({
      item: { cost_price: 120 },
      branchId: BRANCH_ID,
      productId: "prod-1",
      productInfo: { cost_price: 90 },
      branchInventoryMap: {
        [`${BRANCH_ID}_prod-1`]: { cost_price: 300 },
      },
    });

    expect(resolved).toEqual({
      unitCost: 120,
      costSource: COST_SOURCE.SALE_DETAIL_SNAPSHOT,
      isCostEstimated: false,
    });
  });

  it("cae al inventario de la sucursal cuando el snapshot es 0", () => {
    const resolved = resolveSaleDetailUnitCost({
      item: { cost_price: 0 },
      branchId: BRANCH_ID,
      productId: "prod-1",
      productInfo: { cost_price: 90 },
      branchInventoryMap: {
        [`${BRANCH_ID}_prod-1`]: { cost_price: 300 },
      },
    });

    expect(resolved).toEqual({
      unitCost: 300,
      costSource: COST_SOURCE.BRANCH_INVENTORY,
      isCostEstimated: true,
    });
  });

  it("cae al catalogo cuando no hay snapshot ni fila de inventario", () => {
    const resolved = resolveSaleDetailUnitCost({
      item: { cost_price: 0 },
      branchId: BRANCH_ID,
      productId: "prod-1",
      productInfo: { cost_price: 90 },
      branchInventoryMap: {},
    });

    expect(resolved).toEqual({
      unitCost: 90,
      costSource: COST_SOURCE.PRODUCT_CATALOG,
      isCostEstimated: true,
    });
  });

  it("marca como no resuelto cuando ninguna fuente tiene costo", () => {
    const resolved = resolveSaleDetailUnitCost({
      item: {},
      branchId: BRANCH_ID,
      productId: "prod-1",
      productInfo: {},
      branchInventoryMap: {},
    });

    expect(resolved).toEqual({
      unitCost: 0,
      costSource: COST_SOURCE.UNRESOLVED,
      isCostEstimated: true,
    });
  });

  it("respeta un costo ya calculado en 0 en vez de heredar el catalogo", () => {
    const resolved = resolveSaleDetailUnitCost({
      item: { cost_price: 0 },
      branchId: BRANCH_ID,
      productId: "prod-1",
      productInfo: { cost_price: 90 },
      branchInventoryMap: {
        [`${BRANCH_ID}_prod-1`]: { cost_price: 0 },
      },
    });

    expect(resolved.unitCost).toBe(0);
    expect(resolved.costSource).toBe(COST_SOURCE.BRANCH_INVENTORY);
  });

  it("neutraliza a 0 un snapshot sucio, negativo o no numerico (R2)", () => {
    const dirty = [null, undefined, "cuatrocientos", -50, NaN, Infinity];

    for (const costPrice of dirty) {
      const resolved = resolveSaleDetailUnitCost({
        item: { cost_price: costPrice },
        branchId: BRANCH_ID,
        productId: "prod-1",
        productInfo: { cost_price: 90 },
        branchInventoryMap: {},
      });

      expect(resolved.unitCost).toBe(90);
      expect(resolved.isCostEstimated).toBe(true);
    }
  });
});

describe("aggregateProductsProfitability: costo congelado por venta", () => {
  it("usa el snapshot aunque el inventario de la sucursal tenga otro costo", () => {
    const [product] = buildContext({
      saleDetails: [regularDetail({ cost_price: 120 })],
      branchInventoryMap: {
        [`${BRANCH_ID}_prod-1`]: { cost_price: 300 },
      },
      productsMap: {
        "prod-1": {
          id: "prod-1",
          name: "Alimento",
          barcode: "7501",
          department_id: "dep1",
          cost_price: 90,
        },
      },
    });

    // 2 pzas a costo congelado de 120 => 240 de costo sobre 500 de ingreso.
    expect(product.averageCostPrice).toBe(120);
    expect(product.totalCost).toBe(240);
    expect(product.grossProfit).toBe(260);
    expect(product.costSource).toBe(COST_SOURCE.SALE_DETAIL_SNAPSHOT);
    expect(product.hasFrozenCost).toBe(true);
    expect(product.isCostEstimated).toBe(false);
  });

  it("no deja que un reprecio posterior reescriba el margen historico", () => {
    const saleDetails = [regularDetail({ cost_price: 100 })];

    const beforeReprecio = buildContext({
      saleDetails,
      branchInventoryMap: {
        [`${BRANCH_ID}_prod-1`]: { cost_price: 100 },
      },
    });

    const afterReprecio = buildContext({
      saleDetails,
      branchInventoryMap: {
        [`${BRANCH_ID}_prod-1`]: { cost_price: 400 },
      },
    });

    expect(beforeReprecio[0].totalCost).toBe(afterReprecio[0].totalCost);
    expect(beforeReprecio[0].grossProfit).toBe(afterReprecio[0].grossProfit);
  });

  it("marca el costo como estimado cuando la partida cae al fallback", () => {
    const [product] = buildContext({
      saleDetails: [regularDetail({ cost_price: 0 })],
      branchInventoryMap: {
        [`${BRANCH_ID}_prod-1`]: { cost_price: 250 },
      },
    });

    expect(product.averageCostPrice).toBe(250);
    expect(product.costSource).toBe(COST_SOURCE.BRANCH_INVENTORY);
    expect(product.hasFrozenCost).toBe(false);
    expect(product.isCostEstimated).toBe(true);
    expect(product.hasCostAssigned).toBe(true);
  });

  it("promedia el snapshot con el fallback sin romper el reporte historico", () => {
    const [product] = buildContext({
      saleDetails: [
        regularDetail({ id: "sd-1", sale_id: "sale-1", cost_price: 100 }),
        regularDetail({
          id: "sd-2",
          sale_id: "sale-2",
          cost_price: 0,
          quantity: 1,
          total_price: 250,
        }),
      ],
      branchInventoryMap: {
        [`${BRANCH_ID}_prod-1`]: { cost_price: 200 },
      },
    });

    // 2 pzas a 100 + 1 pza a 200 => 400 / 3 unidades.
    expect(product.totalUnits).toBe(3);
    expect(product.totalCost).toBe(400);
    expect(product.averageCostPrice).toBeCloseTo(133.33, 2);
    expect(product.costSource).toBe(COST_SOURCE.SALE_DETAIL_SNAPSHOT);
    expect(product.hasFrozenCost).toBe(true);
    expect(product.isCostEstimated).toBe(false);
  });

  it("mantiene estimado el costo cuando ninguna linea tiene snapshot", () => {
    const [product] = buildContext({
      saleDetails: [
        regularDetail({ id: "sd-1", sale_id: "sale-1", cost_price: 0 }),
        regularDetail({
          id: "sd-2",
          sale_id: "sale-2",
          cost_price: null,
        }),
      ],
      branchInventoryMap: {
        [`${BRANCH_ID}_prod-1`]: { cost_price: 250 },
      },
    });

    expect(product.hasFrozenCost).toBe(false);
    expect(product.isCostEstimated).toBe(true);
  });
});

describe("aggregateProductsProfitability: kits valuados por componentes (R1)", () => {
  const kitContext = ({ kitCostPrice = 0 } = {}) => ({
    saleDetails: [
      regularDetail({
        id: "sd-kit",
        product_id: "kit-1",
        cost_price: kitCostPrice,
        products: { id: "kit-1", name: "Kit Promo", barcode: "KIT1" },
      }),
    ],
    branchInventoryMap: {
      [`${BRANCH_ID}_comp-1`]: { cost_price: 60 },
      [`${BRANCH_ID}_comp-2`]: { cost_price: 40 },
    },
    productsMap: {
      "kit-1": {
        id: "kit-1",
        name: "Kit Promo",
        is_kit: true,
        cost_price: 999,
      },
      "comp-1": { id: "comp-1", name: "Comida", barcode: "C1" },
      "comp-2": { id: "comp-2", name: "Juguete", barcode: "C2" },
    },
    kitsMap: {
      "kit-1": {
        id: "pk-1",
        kit_product_id: "kit-1",
        product_kit_items: [
          { component_product_id: "comp-1", quantity: 2 },
          { component_product_id: "comp-2", quantity: 1 },
        ],
      },
    },
  });

  it("ignora el snapshot en 0 del kit y suma el costo de sus componentes", () => {
    const [product] = buildContext(kitContext());

    // 2 x 60 + 1 x 40 = 160, no el 0 congelado ni el 999 del catalogo.
    expect(product.isKit).toBe(true);
    expect(product.averageCostPrice).toBe(160);
    expect(product.costSource).toBe(COST_SOURCE.KIT_COMPONENTS);
    expect(product.isCostEstimated).toBe(false);
    expect(product.hasFrozenCost).toBe(false);
    expect(product.hasCostAssigned).toBe(true);
  });

  it("expone el desglose de componentes con su costo unitario", () => {
    const [product] = buildContext(kitContext());

    expect(product.kitComponentsCount).toBe(2);
    expect(product.kitComponentsDetails).toEqual([
      expect.objectContaining({
        componentId: "comp-1",
        quantity: 2,
        unitCost: 60,
        totalCost: 120,
      }),
      expect.objectContaining({
        componentId: "comp-2",
        quantity: 1,
        unitCost: 40,
        totalCost: 40,
      }),
    ]);
  });

  it("no infla el margen al 100 % por tomar el cero del snapshot como costo real", () => {
    const [product] = buildContext(kitContext());

    expect(product.grossProfit).toBe(500 - 160 * 2);
    expect(product.grossMarginPercent).toBeCloseTo(36, 5);
    expect(product.grossMarginPercent).toBeLessThan(100);
  });
});
