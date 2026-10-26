import { describe, it, expect } from "vitest";

import {
  buildDiscrepancyNotes,
  buildReceiptFeedback,
  calculateDifference,
  filterOrderHistory,
  filterOrderProducts,
  getMissingReceiptItems,
  getOrderDifferenceCount,
  getOrderDifferences,
  getOrderTotals,
  getPendingOrdersCount,
  getReceivedQuantitiesPayload,
  isReceiptComplete,
  normalizeOrders,
  parseReceiptQuantity,
} from "./ordersCalculationService";

const items = [
  {
    productId: "p1",
    productName: "Croqueta Cachorro 10kg",
    expectedQty: 5,
  },
  {
    productId: "p2",
    productName: "Shampoo Antipulgas",
    expectedQty: 2,
  },
];

const baseOrder = {
  id: "o1",
  orderNumber: "PED-20261022-0001",
  orderName: "Pedido semanal",
  status: "pending",
  fromBranchId: "b1",
  toBranchId: "b2",
  sentAt: "2026-10-22T15:00:00.000Z",
  items,
};

describe("ordersCalculationService", () => {
  it("parsea cantidades capturadas y rechaza vacios o negativos", () => {
    expect(parseReceiptQuantity("3")).toBe(3);
    expect(parseReceiptQuantity("2.5")).toBe(2.5);
    expect(parseReceiptQuantity("0")).toBe(0);
    expect(parseReceiptQuantity("")).toBeNull();
    expect(parseReceiptQuantity(" ")).toBeNull();
    expect(parseReceiptQuantity("-1")).toBeNull();
    expect(parseReceiptQuantity("abc")).toBeNull();
  });

  it("calcula diferencias entre esperado y recibido", () => {
    expect(calculateDifference(5, 3)).toBe(-2);
    expect(calculateDifference(5, 5)).toBe(0);
    expect(calculateDifference(5, 7)).toBe(2);
    expect(calculateDifference(5, "")).toBeNull();
  });

  it("exige conteo fisico de todas las partidas", () => {
    expect(isReceiptComplete(items, {})).toBe(false);
    expect(isReceiptComplete(items, { p1: "5" })).toBe(false);
    expect(isReceiptComplete(items, { p1: "5", p2: "2" })).toBe(true);
    expect(isReceiptComplete(items, { p1: "5", p2: "" })).toBe(false);
    expect(isReceiptComplete([], {})).toBe(false);
  });

  it("lista partidas faltantes de capturar", () => {
    const missing = getMissingReceiptItems(items, { p1: "5" });

    expect(missing).toHaveLength(1);
    expect(missing[0].productId).toBe("p2");
  });

  it("construye el payload para la RPC solo con cantidades validas", () => {
    expect(getReceivedQuantitiesPayload(items, { p1: "4", p2: "" })).toEqual({
      p1: 4,
    });
  });

  it("genera notas de diferencia con faltantes y sobrantes", () => {
    expect(buildDiscrepancyNotes(items, { p1: "2", p2: "3" })).toBe(
      "Faltantes: 3x Croqueta Cachorro 10kg (-3); Sobrantes: 1x Shampoo Antipulgas (+1)"
    );
  });

  it("no genera notas cuando el conteo coincide", () => {
    expect(buildDiscrepancyNotes(items, { p1: "5", p2: "2" })).toBe("");
  });

  it("calcula totales y partidas pendientes", () => {
    const totals = getOrderTotals([
      { expectedQty: 5, receivedQty: 3, differenceQty: -2, costPrice: 10 },
      { expectedQty: 2, receivedQty: null, differenceQty: null, costPrice: 5 },
    ]);

    expect(totals).toEqual({
      expected: 7,
      received: 3,
      difference: -2,
      pending: 1,
      totalCost: 60,
    });
  });

  it("cuenta pedidos pendientes de la sucursal activa", () => {
    const orders = [
      { status: "pending", toBranchId: "b2" },
      { status: "pending", toBranchId: "b1" },
      { status: "accepted", toBranchId: "b2" },
    ];

    expect(getPendingOrdersCount({ orders, currentBranchId: "b2" })).toBe(1);
    expect(getPendingOrdersCount({ orders, currentBranchId: "" })).toBe(0);
  });

  it("filtra el historial por estado, sucursal y fechas", () => {
    const orders = [
      { ...baseOrder, id: "o1" },
      {
        ...baseOrder,
        id: "o2",
        status: "accepted",
        fromBranchId: "b3",
        sentAt: "2026-09-01T15:00:00.000Z",
      },
    ];

    expect(filterOrderHistory(orders, { status: "pending" })).toHaveLength(1);
    expect(filterOrderHistory(orders, { fromBranchId: "b3" })).toHaveLength(1);
    expect(
      filterOrderHistory(orders, {
        dateFrom: new Date(2026, 9, 1),
        dateTo: new Date(2026, 9, 31),
      })
    ).toHaveLength(1);
    expect(filterOrderHistory(orders, {})).toHaveLength(2);
  });

  it("incluye pedidos enviados durante el ultimo dia del rango", () => {
    const orders = [
      { ...baseOrder, id: "o1", sentAt: new Date(2026, 9, 31, 23, 30, 0) },
      { ...baseOrder, id: "o2", sentAt: new Date(2026, 10, 1, 0, 1, 0) },
    ];

    expect(
      filterOrderHistory(orders, {
        dateFrom: new Date(2026, 9, 1),
        dateTo: new Date(2026, 9, 31),
      })
    ).toHaveLength(1);
  });

  it("filtra productos por codigo, nombre o departamento", () => {
    const products = [
      {
        id: "p1",
        codigo: "ABC-1",
        descripcion: "Croqueta Adulto",
        departamento: "Alimento",
        status: true,
      },
      {
        id: "p2",
        codigo: "XYZ-2",
        descripcion: "Shampoo",
        departamento: "Higiene",
        status: true,
      },
      { id: "p3", codigo: "OFF", status: false },
    ];

    expect(filterOrderProducts(products, "abc")).toHaveLength(1);
    expect(filterOrderProducts(products, "higiene")).toHaveLength(1);
    expect(filterOrderProducts(products, "shampoo")).toHaveLength(1);
    expect(filterOrderProducts(products, "")).toHaveLength(2);
  });

  it("normaliza y ordena pedidos por fecha descendente", () => {
    const result = normalizeOrders([
      {
        ...baseOrder,
        id: "old",
        sentAt: "2026-10-01T15:00:00.000Z",
        store_order_items: items.map((item) => ({
          product_id: item.productId,
          product_name: item.productName,
          expected_qty: item.expectedQty,
        })),
      },
      { ...baseOrder, id: "new" },
    ]);

    expect(result.map((order) => order.id)).toEqual(["new", "old"]);
    expect(result[1].items[0].productId).toBe("p1");
    expect(result[1].items[0].expectedQty).toBe(5);
  });
});

describe("getOrderDifferences", () => {
  it("filtra diferencias cero o nulas y normaliza el valor", () => {
    const items = [
      { differenceQty: -2, barcode: "A" },
      { differenceQty: 0 },
      { differenceQty: null },
      { differenceQty: "3" },
    ];
    const result = getOrderDifferences(items);
    expect(result).toHaveLength(2);
    expect(result[0].differenceQty).toBe(-2);
    expect(result[1].differenceQty).toBe(3);
  });
});

describe("buildReceiptFeedback", () => {
  it("informa exito cuando no hay diferencias", () => {
    const feedback = buildReceiptFeedback({
      orderNumber: "PED-1",
      items: [{ differenceQty: 0 }, { differenceQty: null }],
    });

    expect(feedback.tone).toBe("success");
    expect(feedback.message).toContain("PED-1 recibido correctamente");
  });

  it("solo cuenta los productos con diferencia", () => {
    const feedback = buildReceiptFeedback({
      orderNumber: "PED-2",
      items: [
        { differenceQty: -1 },
        { differenceQty: 2 },
        { differenceQty: 0 },
      ],
    });

    expect(feedback.tone).toBe("warning");
    expect(feedback.message).toBe(
      "Pedido PED-2 recibido con 2 productos con diferencia."
    );
  });

  it("usa singular con una sola diferencia", () => {
    const feedback = buildReceiptFeedback({
      orderNumber: "PED-3",
      items: [{ differenceQty: -1 }],
    });

    expect(feedback.message).toBe(
      "Pedido PED-3 recibido con 1 producto con diferencia."
    );
  });
});

describe("getOrderDifferenceCount", () => {
  it("retorna null en pedidos pendientes o cancelados", () => {
    expect(
      getOrderDifferenceCount({ status: "pending", items: [] })
    ).toBeNull();
    expect(
      getOrderDifferenceCount({ status: "cancelled", items: [] })
    ).toBeNull();
  });

  it("cuenta faltantes y sobrantes por producto", () => {
    expect(
      getOrderDifferenceCount({
        status: "accepted_with_difference",
        items: [
          { differenceQty: -2 },
          { differenceQty: 3 },
          { differenceQty: 0 },
          { differenceQty: null },
        ],
      })
    ).toBe(2);
  });

  it("retorna 0 cuando se recibio sin diferencias", () => {
    expect(
      getOrderDifferenceCount({
        status: "accepted",
        items: [{ differenceQty: 0 }],
      })
    ).toBe(0);
  });
});
