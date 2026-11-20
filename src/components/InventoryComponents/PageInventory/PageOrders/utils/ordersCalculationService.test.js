import { describe, it, expect } from "vitest";

import {
  buildMissingReceiptCostError,
  getInitialReceiptCosts,
  getMissingReceiptCostItems,
  getReceivedCostsPayload,
  parseReceiptCost,
  RECEIPT_COST_MAX,
  buildDiscrepancyNotes,
  calculateDifference,
  filterOrderHistory,
  filterOrderProducts,
  getMissingReceiptItems,
  getOrderDifferenceCount,
  getOrderDifferenceSummary,
  getOrderDifferences,
  getOrderItemStatus,
  getOrderItemStatusMatch,
  getOrderItemsByStatus,
  getOrderTotals,
  getPendingOrdersCount,
  getReceivedQuantitiesPayload,
  isOrderReceived,
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

describe("isOrderReceived", () => {
  it("excluye pedidos pendientes, cancelados y vacios", () => {
    expect(isOrderReceived({ status: "pending" })).toBe(false);
    expect(isOrderReceived({ status: "cancelled" })).toBe(false);
    expect(isOrderReceived(null)).toBe(false);
  });

  it("incluye pedidos aceptados con o sin diferencia", () => {
    expect(isOrderReceived({ status: "accepted" })).toBe(true);
    expect(isOrderReceived({ status: "accepted_with_difference" })).toBe(true);
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

describe("getOrderDifferenceSummary", () => {
  it("retorna null en pedidos pendientes o cancelados", () => {
    expect(
      getOrderDifferenceSummary({ status: "pending", items: [] })
    ).toBeNull();
    expect(
      getOrderDifferenceSummary({ status: "cancelled", items: [] })
    ).toBeNull();
  });

  it("separa productos con faltante y con sobrante", () => {
    expect(
      getOrderDifferenceSummary({
        status: "accepted_with_difference",
        items: [
          { differenceQty: -2 },
          { differenceQty: -1 },
          { differenceQty: 5 },
          { differenceQty: 0 },
        ],
      })
    ).toEqual({ shortages: 2, overages: 1 });
  });

  it("retorna ceros cuando se recibio sin diferencias", () => {
    expect(
      getOrderDifferenceSummary({
        status: "accepted",
        items: [{ differenceQty: 0 }],
      })
    ).toEqual({ shortages: 0, overages: 0 });
  });
});

describe("getOrderItemStatus", () => {
  it("marca todas las partidas como pendientes o canceladas segun el pedido", () => {
    expect(getOrderItemStatus({ differenceQty: 0 }, "pending")).toBe("pending");
    expect(getOrderItemStatus({ differenceQty: 0 }, "cancelled")).toBe(
      "cancelled"
    );
  });

  it("deriva el estado de la partida desde la diferencia recibida", () => {
    expect(getOrderItemStatus({ differenceQty: 0 }, "accepted")).toBe(
      "accepted"
    );
    expect(
      getOrderItemStatus({ differenceQty: -2 }, "accepted_with_difference")
    ).toBe("shortage");
    expect(
      getOrderItemStatus({ differenceQty: 3 }, "accepted_with_difference")
    ).toBe("overage");
  });

  it("calcula la diferencia cuando el pedido no la trae persistida", () => {
    expect(
      getOrderItemStatus(
        { expectedQty: 5, receivedQty: 4, differenceQty: null },
        "accepted_with_difference"
      )
    ).toBe("shortage");
    expect(
      getOrderItemStatus(
        { expectedQty: 5, receivedQty: 7, differenceQty: null },
        "accepted_with_difference"
      )
    ).toBe("overage");
  });

  it("trata como pendiente una partida sin conteo recibido", () => {
    expect(
      getOrderItemStatus(
        { expectedQty: 5, receivedQty: null, differenceQty: null },
        "accepted"
      )
    ).toBe("pending");
    expect(getOrderItemStatus(null, "accepted")).toBeNull();
  });
});

describe("getOrderItemsByStatus", () => {
  const order = {
    status: "accepted_with_difference",
    items: [
      { productId: "p1", productName: "Croqueta", differenceQty: 0 },
      { productId: "p2", productName: "Shampoo", differenceQty: -1 },
      { productId: "p3", productName: "Juguete", differenceQty: 2 },
    ],
  };

  it("devuelve las partidas que coinciden con el estado", () => {
    expect(
      getOrderItemsByStatus(order, "shortage").map((item) => item.productId)
    ).toEqual(["p2"]);
    expect(getOrderItemsByStatus(order, "overage")).toHaveLength(1);
    expect(getOrderItemsByStatus(order, "accepted")).toHaveLength(1);
    expect(getOrderItemsByStatus(order, "all")).toEqual([]);
  });

  it("resume etiqueta, conteo y nombres de las partidas que coinciden", () => {
    expect(getOrderItemStatusMatch(order, "shortage")).toEqual({
      status: "shortage",
      label: "Faltante",
      count: 1,
      names: ["Shampoo"],
    });
    expect(getOrderItemStatusMatch(order, "accepted").names).toEqual([
      "Croqueta",
    ]);
    expect(getOrderItemStatusMatch(order, "pending")).toBeNull();
    expect(getOrderItemStatusMatch(order, "all")).toBeNull();
  });
});

describe("filterOrderHistory por sucursal involucrada", () => {
  const received = {
    ...baseOrder,
    id: "in",
    fromBranchId: "x",
    toBranchId: "a",
  };
  const sent = { ...baseOrder, id: "out", fromBranchId: "a", toBranchId: "y" };
  const unrelated = {
    ...baseOrder,
    id: "none",
    fromBranchId: "x",
    toBranchId: "y",
  };

  it("conserva pedidos donde la sucursal es origen o destino", () => {
    expect(
      filterOrderHistory([received, sent, unrelated], {
        involvedBranchId: "a",
      }).map((order) => order.id)
    ).toEqual(["in", "out"]);
  });

  it("se combina con el filtro de origen", () => {
    expect(
      filterOrderHistory([received, sent, unrelated], {
        involvedBranchId: "a",
        fromBranchId: "x",
      }).map((order) => order.id)
    ).toEqual(["in"]);
  });

  it("no filtra con el valor all", () => {
    expect(
      filterOrderHistory([received, unrelated], { involvedBranchId: "all" })
    ).toHaveLength(2);
  });
});

describe("filterOrderHistory por estado del producto", () => {
  const receivedOrder = {
    ...baseOrder,
    id: "received",
    status: "accepted_with_difference",
    items: [
      { productId: "p1", productName: "Croqueta", differenceQty: 0 },
      { productId: "p2", productName: "Shampoo", differenceQty: -1 },
    ],
  };
  const cleanOrder = {
    ...baseOrder,
    id: "clean",
    status: "accepted",
    items: [{ productId: "p3", productName: "Juguete", differenceQty: 0 }],
  };
  const pendingOrder = { ...baseOrder, id: "pending" };

  it("conserva los pedidos con al menos una partida en ese estado", () => {
    const orders = [receivedOrder, cleanOrder, pendingOrder];

    expect(
      filterOrderHistory(orders, { itemStatus: "shortage" }).map(
        (order) => order.id
      )
    ).toEqual(["received"]);
    expect(
      filterOrderHistory(orders, { itemStatus: "accepted" }).map(
        (order) => order.id
      )
    ).toEqual(["received", "clean"]);
    expect(
      filterOrderHistory(orders, { itemStatus: "pending" }).map(
        (order) => order.id
      )
    ).toEqual(["pending"]);
  });

  it("convive con el filtro de estado del pedido", () => {
    const orders = [receivedOrder, cleanOrder, pendingOrder];

    expect(
      filterOrderHistory(orders, {
        status: "accepted",
        itemStatus: "shortage",
      })
    ).toHaveLength(0);
    expect(
      filterOrderHistory(orders, {
        status: "accepted_with_difference",
        itemStatus: "shortage",
      })
    ).toHaveLength(1);
  });

  it("ignora el filtro cuando vale all", () => {
    expect(
      filterOrderHistory([receivedOrder, cleanOrder], { itemStatus: "all" })
    ).toHaveLength(2);
  });
});

describe("costo de recepcion", () => {
  const items = [
    { productId: "p1", costPrice: 120 },
    { productId: "p2", costPrice: "45.555" },
    { productId: "p3", costPrice: null },
    { productId: "p4", costPrice: 0 },
  ];

  it("parseReceiptCost descarta vacios y negativos y redondea a 2 decimales", () => {
    expect(parseReceiptCost("")).toBeNull();
    expect(parseReceiptCost("-1")).toBeNull();
    expect(parseReceiptCost("0")).toBe(0);
    expect(parseReceiptCost("10.126")).toBe(10.13);
    expect(parseReceiptCost(String(RECEIPT_COST_MAX))).toBe(RECEIPT_COST_MAX);
    expect(parseReceiptCost(String(RECEIPT_COST_MAX + 0.01))).toBeNull();
    expect(parseReceiptCost("NaN")).toBeNull();
    expect(parseReceiptCost("Infinity")).toBeNull();
  });

  it("precarga el costo del pedido con 2 decimales", () => {
    expect(getInitialReceiptCosts(items)).toEqual({
      p1: "120.00",
      p2: "45.56",
      p3: "",
      p4: "",
    });
  });

  it("solo exige costo a partidas con cantidad recibida mayor a 0", () => {
    const missing = getMissingReceiptCostItems(
      items,
      { p1: "3", p2: "0", p3: "1" },
      { p1: "120", p2: "", p3: "" }
    );

    expect(missing.map((item) => item.productId)).toEqual(["p3"]);
  });

  it("arma el payload solo con partidas recibidas y costo valido", () => {
    expect(
      getReceivedCostsPayload(
        items,
        { p1: "3", p2: "0", p3: "1" },
        { p1: "99.5", p2: "10", p3: "0" }
      )
    ).toEqual({ p1: 99.5, p3: 0 });
  });
});

describe("buildMissingReceiptCostError", () => {
  it("indica cuantas partidas no tienen costo", () => {
    expect(buildMissingReceiptCostError(2)).toBe(
      "Captura el costo de los productos recibidos (2 pendiente(s))."
    );
  });
});
