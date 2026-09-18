import { describe, it, expect } from "vitest";

import {
  mapInventoryRowsToItems,
  calculateInventoryKpis,
  buildDepartmentBreakdown,
  buildReorderSuggestions,
  buildExhaustedProducts,
  buildDepartments,
} from "./inventoryReportCalculationService";

const inventoryRow = (overrides = {}) => ({
  product_id: "p1",
  barcode: "7501",
  product_name: "CROQUETA PREMIUM",
  department_id: "dp1",
  department_name: "Alimentos",
  tracks_inventory: true,
  is_kit: false,
  stock: 20,
  min_stock: 5,
  max_stock: 50,
  cost_price: 30,
  sale_price: 45,
  total_cost: 600,
  total_sale: 900,
  has_been_stocked: true,
  has_inventory_record: true,
  status: "optimal",
  status_label: "Optimo",
  suggested_qty: 0,
  ...overrides,
});

describe("inventoryReportCalculationService", () => {
  describe("mapInventoryRowsToItems", () => {
    it("devuelve [] sin filas", () => {
      expect(mapInventoryRowsToItems([])).toEqual([]);
    });

    it("mapea filas y calcula estimatedInvestment en cliente", () => {
      const [item] = mapInventoryRowsToItems([
        inventoryRow({ suggested_qty: 10 }),
      ]);

      expect(item).toEqual({
        id: "p1",
        barcode: "7501",
        name: "CROQUETA PREMIUM",
        departmentId: "dp1",
        departmentName: "Alimentos",
        tracks_inventory: true,
        is_kit: false,
        stock: 20,
        min_stock: 5,
        max_stock: 50,
        cost_price: 30,
        sale_price: 45,
        total_cost: 600,
        total_sale: 900,
        has_been_stocked: true,
        has_inventory_record: true,
        status: "optimal",
        statusLabel: "Optimo",
        suggestedQty: 10,
        estimatedInvestment: 300,
      });
    });

    it("aplica defaults para campos ausentes", () => {
      const [item] = mapInventoryRowsToItems([
        inventoryRow({
          barcode: null,
          product_name: null,
          department_name: null,
          stock: null,
          total_cost: null,
          total_sale: null,
        }),
      ]);

      expect(item.barcode).toBe("");
      expect(item.name).toBe("Sin nombre");
      expect(item.departmentName).toBe("Sin departamento");
      expect(item.stock).toBe(0);
      expect(item.total_cost).toBe(0);
      expect(item.total_sale).toBe(0);
      expect(item.estimatedInvestment).toBe(0);
    });
  });

  describe("calculateInventoryKpis", () => {
    it("valoriza solo inventario controlado con stock y cuenta estados", () => {
      const items = [
        {
          tracks_inventory: true,
          stock: 20,
          total_cost: 600,
          total_sale: 900,
          status: "optimal",
        },
        {
          tracks_inventory: true,
          stock: 2,
          total_cost: 60,
          total_sale: 90,
          status: "low",
        },
        {
          tracks_inventory: true,
          stock: 0,
          total_cost: 0,
          total_sale: 0,
          status: "exhausted",
        },
        {
          tracks_inventory: false,
          stock: 5,
          total_cost: 50,
          total_sale: 80,
          status: "optimal",
        },
      ];

      const kpis = calculateInventoryKpis(items);

      expect(kpis).toMatchObject({
        totalCostValuation: 660,
        totalSaleValuation: 990,
        projectedProfit: 330,
        totalUnits: 22,
        totalSkus: 3,
        exhaustedCount: 1,
        lowStockCount: 1,
        optimalStockCount: 2,
        excessStockCount: 0,
      });
      expect(kpis.profitMargin).toBeCloseTo(33.33, 1);
    });

    it("no proyecta ganancia negativa ni margen sin ventas", () => {
      const kpis = calculateInventoryKpis([
        {
          tracks_inventory: true,
          stock: 1,
          total_cost: 100,
          total_sale: 0,
          status: "excess",
        },
      ]);

      expect(kpis.projectedProfit).toBe(0);
      expect(kpis.profitMargin).toBe(0);
      expect(kpis.excessStockCount).toBe(1);
    });
  });

  describe("buildDepartmentBreakdown", () => {
    it("agrupa por departamento y ordena por valor al costo", () => {
      const items = [
        {
          departmentName: "Alimentos",
          stock: 20,
          total_cost: 600,
          total_sale: 900,
        },
        {
          departmentName: "Alimentos",
          stock: 5,
          total_cost: 100,
          total_sale: 150,
        },
        {
          departmentName: "Farmacia",
          stock: 10,
          total_cost: 100,
          total_sale: 150,
        },
      ];

      const result = buildDepartmentBreakdown(items, 700);

      expect(result[0]).toMatchObject({
        name: "Alimentos",
        productCount: 2,
        totalUnits: 25,
        totalCost: 700,
        totalSale: 1050,
      });
      expect(result[0].percentage).toBe(100);
      expect(result[1].name).toBe("Farmacia");
      expect(result[1].percentage).toBeCloseTo(14.28, 1);
    });

    it("usa Sin departamento y no divide entre cero", () => {
      const result = buildDepartmentBreakdown(
        [{ departmentName: null, stock: 1, total_cost: 0, total_sale: 0 }],
        0
      );

      expect(result).toEqual([
        {
          name: "Sin departamento",
          productCount: 1,
          totalUnits: 1,
          totalCost: 0,
          totalSale: 0,
          percentage: 0,
        },
      ]);
    });
  });

  describe("buildReorderSuggestions", () => {
    it("incluye agotados y stock bajo por orden de stock, sin no controlados", () => {
      const items = [
        { id: "optimal", tracks_inventory: true, status: "optimal", stock: 20 },
        { id: "low", tracks_inventory: true, status: "low", stock: 2 },
        {
          id: "exhausted",
          tracks_inventory: true,
          status: "exhausted",
          stock: 0,
        },
        { id: "untracked", tracks_inventory: false, status: "low", stock: 1 },
      ];

      expect(buildReorderSuggestions(items).map((i) => i.id)).toEqual([
        "exhausted",
        "low",
      ]);
    });
  });

  describe("buildExhaustedProducts", () => {
    it("filtra agotados controlados y ordena por nombre", () => {
      const items = [
        { id: "b", name: "Zeta", tracks_inventory: true, status: "exhausted" },
        { id: "a", name: "Alfa", tracks_inventory: true, status: "exhausted" },
        { id: "c", name: "Beta", tracks_inventory: false, status: "exhausted" },
        { id: "d", name: "Gamma", tracks_inventory: true, status: "low" },
      ];

      expect(buildExhaustedProducts(items).map((i) => i.id)).toEqual([
        "a",
        "b",
      ]);
    });
  });

  describe("buildDepartments", () => {
    it("genera departamentos unicos ordenados por nombre", () => {
      const items = [
        { departmentId: "dp2", departmentName: "Farmacia" },
        { departmentId: "dp1", departmentName: "Alimentos" },
        { departmentId: "dp1", departmentName: "Alimentos" },
        { departmentId: null, departmentName: "Sin departamento" },
      ];

      expect(buildDepartments(items)).toEqual([
        { id: "dp1", name: "Alimentos" },
        { id: "dp2", name: "Farmacia" },
      ]);
    });
  });
});
