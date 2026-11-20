import { describe, it, expect } from "vitest";

import {
  buildNoStockRows,
  calculateMovementKpis,
  hydrateBaseMovements,
  hydrateMissingRedemptions,
} from "./movementsCalculationService";

const buildDeps = () => ({
  productsById: new Map([["p1", { id: "p1", name: "Croquetas" }]]),
  usersById: new Map([["u1", { id: "u1", username: "admin" }]]),
  salesById: new Map([
    [
      "s1",
      {
        id: "s1",
        sale_date: "2026-10-01T10:00:00Z",
        ticket_number: "TCK-1234",
      },
    ],
  ]),
  rewardsById: new Map([["r1", { id: "r1", name: "Premio Lealtad" }]]),
});

describe("movementsCalculationService", () => {
  describe("hydrateBaseMovements", () => {
    it("hidrata filas base con producto, usuario y venta", () => {
      const deps = buildDeps();
      const baseRows = [
        {
          id: "m1",
          product_id: "p1",
          user_id: "u1",
          sale_id: "s1",
          movement_type: "sale",
          quantity: -2,
          reason: "Venta mostrador",
          created_at: "2026-10-01T10:00:00Z",
        },
      ];

      const result = hydrateBaseMovements({
        baseRows,
        rewardRows: [],
        ...deps,
      });

      expect(result).toHaveLength(1);
      expect(result[0].products).toEqual({ id: "p1", name: "Croquetas" });
      expect(result[0].users).toEqual({ id: "u1", username: "admin" });
      expect(result[0].sales.id).toBe("s1");
      expect(result[0].row_key).toBe("movement-m1");
      expect(result[0].report_sort_at).toBe("2026-10-01T10:00:00Z");
    });

    it("construye row_key con product_id y created_at si no hay id", () => {
      const deps = buildDeps();
      const baseRows = [
        {
          product_id: "p1",
          created_at: "2026-10-01T10:00:00Z",
          movement_type: "adjustment",
        },
      ];

      const result = hydrateBaseMovements({
        baseRows,
        rewardRows: [],
        ...deps,
      });

      expect(result[0].row_key).toBe("movement-p1-2026-10-01T10:00:00Z");
    });

    it("marca has_sale_redemption si la venta tiene canje asociado", () => {
      const deps = buildDeps();
      const baseRows = [
        {
          id: "m1",
          product_id: "p1",
          sale_id: "s1",
          movement_type: "sale",
          quantity: -1,
        },
      ];
      const rewardRows = [
        { sale_id: "s1", product_id: "p1", reward_id: "r1", quantity: 1 },
      ];

      const result = hydrateBaseMovements({
        baseRows,
        rewardRows,
        ...deps,
      });

      expect(result[0].has_sale_redemption).toBe(true);
    });

    it("reemplaza reason por redemption reason si hay canje y es venta", () => {
      const deps = buildDeps();
      const baseRows = [
        {
          id: "m1",
          product_id: "p1",
          sale_id: "s1",
          movement_type: "sale",
          quantity: -1,
          reason: "Venta mostrador",
        },
      ];
      const rewardRows = [
        {
          sale_id: "s1",
          product_id: "p1",
          reward_id: "r1",
          points_used: 100,
          quantity: 1,
        },
      ];

      const result = hydrateBaseMovements({
        baseRows,
        rewardRows,
        ...deps,
      });

      expect(result[0].reason).toBe("redemption: Premio Lealtad - 100 PTS");
    });

    it("mantiene reason original si no hay canje asociado", () => {
      const deps = buildDeps();
      const baseRows = [
        {
          id: "m1",
          product_id: "p1",
          movement_type: "adjustment",
          quantity: 5,
          reason: "Ajuste inventario",
        },
      ];

      const result = hydrateBaseMovements({
        baseRows,
        rewardRows: [],
        ...deps,
      });

      expect(result[0].reason).toBe("Ajuste inventario");
    });
  });

  describe("hydrateMissingRedemptions", () => {
    it("genera filas de redención para canjes sin venta asociada en base", () => {
      const deps = buildDeps();
      const rewardRows = [
        {
          id: "rd1",
          sale_id: "s99",
          product_id: "p1",
          reward_id: "r1",
          user_id: "u1",
          quantity: 1,
          points_used: 50,
          created_at: "2026-10-02T12:00:00Z",
        },
      ];

      const result = hydrateMissingRedemptions({
        baseRows: [],
        rewardRows,
        ...deps,
      });

      expect(result).toHaveLength(1);
      expect(result[0].movement_type).toBe("redemption");
      expect(result[0].quantity).toBe(-1);
      expect(result[0].row_key).toBe("redemption-rd1");
      expect(result[0].reason).toBe("redemption: Premio Lealtad - 50 PTS");
      expect(result[0].previous_stock).toBeNull();
      expect(result[0].new_stock).toBeNull();
    });

    it("omite canjes que ya tienen venta+producto en baseRows", () => {
      const deps = buildDeps();
      const baseRows = [
        {
          id: "m1",
          sale_id: "s1",
          product_id: "p1",
          movement_type: "sale",
        },
      ];
      const rewardRows = [
        {
          id: "rd1",
          sale_id: "s1",
          product_id: "p1",
          reward_id: "r1",
          quantity: 1,
        },
        {
          id: "rd2",
          sale_id: "s1",
          product_id: "p99",
          reward_id: "r1",
          quantity: 2,
        },
      ];

      const result = hydrateMissingRedemptions({
        baseRows,
        rewardRows,
        ...deps,
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("rd2");
    });

    it("retorna cantidad negativa para cualquier quantity valido", () => {
      const deps = buildDeps();
      const rewardRows = [
        {
          id: "rd1",
          sale_id: "s99",
          product_id: "p1",
          reward_id: "r1",
          quantity: 3,
        },
      ];

      const result = hydrateMissingRedemptions({
        baseRows: [],
        rewardRows,
        ...deps,
      });

      expect(result[0].quantity).toBe(-3);
    });

    it("retorna -1 si quantity es 0 o no numerico", () => {
      const deps = buildDeps();
      const rewardRows = [
        {
          id: "rd1",
          sale_id: "s99",
          product_id: "p1",
          reward_id: "r1",
          quantity: 0,
        },
      ];

      const result = hydrateMissingRedemptions({
        baseRows: [],
        rewardRows,
        ...deps,
      });

      expect(result[0].quantity).toBe(-1);
    });

    it("usa display_product_name con rewardLabel si no hay producto", () => {
      const deps = buildDeps();
      deps.productsById = new Map();
      const rewardRows = [
        {
          id: "rd1",
          sale_id: "s99",
          product_id: "p-inexistente",
          reward_id: "r1",
          quantity: 1,
        },
      ];

      const result = hydrateMissingRedemptions({
        baseRows: [],
        rewardRows,
        ...deps,
      });

      expect(result[0].display_product_name).toBe("Premio Lealtad");
    });
  });

  describe("buildNoStockRows", () => {
    const buildNoStockDeps = () => ({
      productsById: new Map([
        ["p1", { id: "p1", name: "Sin Stock", tracks_inventory: false }],
        ["p2", { id: "p2", name: "Con Stock", tracks_inventory: true }],
        [
          "p3",
          {
            id: "p3",
            name: "Kit Sin Stock",
            tracks_inventory: false,
            is_kit: true,
          },
        ],
      ]),
      usersById: new Map([["u1", { id: "u1", username: "admin" }]]),
      salesById: new Map([
        [
          "s1",
          {
            id: "s1",
            sale_date: "2026-10-01T10:00:00Z",
            ticket_number: "TCK-1",
            user_id: "u1",
          },
        ],
      ]),
    });

    it("deriva una fila de venta para productos sin stock", () => {
      const result = buildNoStockRows({
        saleDetails: [
          {
            id: "sd1",
            sale_id: "s1",
            product_id: "p1",
            quantity: 2,
          },
        ],
        canceledSales: [],
        saleReturns: [],
        returnItems: [],
        ...buildNoStockDeps(),
        existingSaleProductKeys: new Set(),
      });

      expect(result).toHaveLength(1);
      expect(result[0].movement_type).toBe("sale");
      expect(result[0].quantity).toBe(-2);
      expect(result[0].previous_stock).toBeNull();
      expect(result[0].new_stock).toBeNull();
      expect(result[0].reason).toBe("Venta registrada");
    });

    it("omite productos que si manejan inventario", () => {
      const result = buildNoStockRows({
        saleDetails: [
          { id: "sd2", sale_id: "s1", product_id: "p2", quantity: 1 },
        ],
        canceledSales: [],
        saleReturns: [],
        returnItems: [],
        ...buildNoStockDeps(),
        existingSaleProductKeys: new Set(),
      });

      expect(result).toHaveLength(0);
    });

    it("omite productos que ya tienen movimiento de venta", () => {
      const result = buildNoStockRows({
        saleDetails: [
          { id: "sd1", sale_id: "s1", product_id: "p1", quantity: 2 },
        ],
        canceledSales: [],
        saleReturns: [],
        returnItems: [],
        ...buildNoStockDeps(),
        existingSaleProductKeys: new Set(["s1::p1"]),
      });

      expect(result).toHaveLength(0);
    });

    it("omite el producto-kit padre aunque no maneje stock", () => {
      const result = buildNoStockRows({
        saleDetails: [
          { id: "sd3", sale_id: "s1", product_id: "p3", quantity: 1 },
        ],
        canceledSales: [],
        saleReturns: [],
        returnItems: [],
        ...buildNoStockDeps(),
        existingSaleProductKeys: new Set(),
      });

      expect(result).toHaveLength(0);
    });

    it("agrega cancelacion y devolucion ademas de la venta", () => {
      const result = buildNoStockRows({
        saleDetails: [
          { id: "sd1", sale_id: "s1", product_id: "p1", quantity: 3 },
        ],
        canceledSales: [
          {
            id: "c1",
            sale_id: "s1",
            user_id: "u1",
            cancel_reason: "Cliente se arrepintio",
            canceled_at: "2026-10-01T11:00:00Z",
          },
        ],
        saleReturns: [
          {
            id: "r1",
            sale_id: "s1",
            user_id: "u1",
            return_reason: "Producto danado",
            created_at: "2026-10-01T12:00:00Z",
          },
        ],
        returnItems: [
          { id: "ri1", return_id: "r1", product_id: "p1", quantity: 1 },
        ],
        ...buildNoStockDeps(),
        existingSaleProductKeys: new Set(),
      });

      const types = result.map((row) => row.movement_type);

      expect(types).toEqual(["sale", "canceled", "return"]);

      const returnRow = result.find((row) => row.movement_type === "return");

      expect(returnRow.quantity).toBe(1);
    });

    it("preserva una fila por cada devolucion parcial con sus metadatos reales", () => {
      const deps = buildNoStockDeps();
      deps.usersById = new Map([
        ["u1", { id: "u1", username: "admin" }],
        ["u2", { id: "u2", username: "cajero2" }],
      ]);

      const result = buildNoStockRows({
        saleDetails: [
          { id: "sd1", sale_id: "s1", product_id: "p1", quantity: 3 },
        ],
        canceledSales: [],
        saleReturns: [
          {
            id: "r1",
            sale_id: "s1",
            user_id: "u1",
            branch_id: "b1",
            return_reason: "Primer ajuste",
            created_at: "2026-10-01T12:00:00Z",
          },
          {
            id: "r2",
            sale_id: "s1",
            user_id: "u2",
            branch_id: "b2",
            return_reason: "Segundo ajuste",
            created_at: "2026-10-01T13:30:00Z",
          },
        ],
        returnItems: [
          { id: "ri1", return_id: "r1", product_id: "p1", quantity: 1 },
          { id: "ri2", return_id: "r2", product_id: "p1", quantity: 2 },
        ],
        ...deps,
        existingSaleProductKeys: new Set(),
      });

      const returnRows = result.filter((row) => row.movement_type === "return");

      expect(returnRows).toHaveLength(2);
      expect(returnRows.map((row) => row.row_key)).toEqual([
        "nostock-return-r1",
        "nostock-return-r2",
      ]);
      expect(returnRows.map((row) => row.quantity)).toEqual([1, 2]);
      expect(returnRows.map((row) => row.created_at)).toEqual([
        "2026-10-01T12:00:00Z",
        "2026-10-01T13:30:00Z",
      ]);
      expect(returnRows.map((row) => row.user_id)).toEqual(["u1", "u2"]);
      expect(returnRows.map((row) => row.branch_id)).toEqual(["b1", "b2"]);
      expect(returnRows.map((row) => row.reason)).toEqual([
        "Primer ajuste",
        "Segundo ajuste",
      ]);
    });
  });
});

describe("calculateMovementKpis", () => {
  it("separa ajustes y reparte el resto por signo", () => {
    const kpis = calculateMovementKpis([
      { movement_type: "entry", quantity: 10 },
      { movement_type: "transfer", quantity: 4 },
      { movement_type: "sale", quantity: -3 },
      { movement_type: "transfer", quantity: -2 },
      { movement_type: "adjustment", quantity: 5 },
      { movement_type: "adjustment", quantity: -7 },
    ]);

    expect(kpis).toEqual({
      entries: { units: 14, count: 2 },
      exits: { units: 5, count: 2 },
      adjustments: { units: -2, count: 2 },
      net: 7,
    });
  });

  it("ignora cantidades no numericas y las forzadas a 0", () => {
    const kpis = calculateMovementKpis([
      { movement_type: "entry", quantity: "x" },
      { movement_type: "product_update", quantity: 9 },
    ]);

    expect(kpis.net).toBe(0);
    expect(kpis.entries.count).toBe(0);
  });

  it("deja fuera de los KPIs las filas SIN STOCK", () => {
    const kpis = calculateMovementKpis([
      { movement_type: "sale", quantity: -3, reason: "Venta (SIN STOCK)" },
      { movement_type: "entry", quantity: 2 },
    ]);

    expect(kpis).toEqual({
      entries: { units: 2, count: 1 },
      exits: { units: 0, count: 0 },
      adjustments: { units: 0, count: 0 },
      net: 2,
    });
  });

  it("devuelve ceros sin filas", () => {
    expect(calculateMovementKpis(null).net).toBe(0);
  });
});
