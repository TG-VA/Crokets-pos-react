import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from "../../../../../lib/supabaseClient";
import {
  fetchBranchesList,
  fetchInventoryReportData,
} from "./inventoryReportService";

const thenableQuery = (resolve = { data: null, error: null }) => {
  const q = {
    select: vi.fn(),
    order: vi.fn(),
  };

  Object.values(q).forEach((fn) => fn.mockReturnValue(q));
  q.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolve).then(onFulfilled, onRejected);

  return q;
};

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

describe("inventoryReportService", () => {
  beforeEach(() => {
    supabase.from.mockReset();
    supabase.rpc.mockReset();
  });

  describe("fetchBranchesList", () => {
    it("consulta y devuelve el catalogo de sucursales", async () => {
      const q = thenableQuery({
        data: [{ id: "b1", name: "Norte", timezone: "America/Mexico_City" }],
        error: null,
      });
      supabase.from.mockReturnValue(q);

      const result = await fetchBranchesList();

      expect(supabase.from).toHaveBeenCalledWith("branches");
      expect(result).toEqual([
        { id: "b1", name: "Norte", timezone: "America/Mexico_City" },
      ]);
    });

    it("devuelve [] si la consulta falla", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      supabase.from.mockReturnValue(
        thenableQuery({ data: null, error: { message: "boom" } })
      );

      const result = await fetchBranchesList();

      expect(result).toEqual([]);
      spy.mockRestore();
    });
  });

  describe("fetchInventoryReportData", () => {
    it("invoca la RPC con p_branch_id null para ALL", async () => {
      supabase.rpc.mockResolvedValue({ data: [], error: null });

      const result = await fetchInventoryReportData("ALL");

      expect(supabase.rpc).toHaveBeenCalledWith("get_inventory_report_data", {
        p_branch_id: null,
      });
      expect(result.items).toEqual([]);
      expect(result.kpis).toMatchObject({
        totalCostValuation: 0,
        totalSaleValuation: 0,
      });
    });

    it("envia el id de sucursal cuando no es ALL", async () => {
      supabase.rpc.mockResolvedValue({ data: [], error: null });

      await fetchInventoryReportData("b1");

      expect(supabase.rpc.mock.calls[0][1]).toEqual({ p_branch_id: "b1" });
    });

    it("mapea filas a items con estimatedInvestment calculado en cliente", async () => {
      supabase.rpc.mockResolvedValue({
        data: [
          inventoryRow({ product_id: "p1" }),
          inventoryRow({
            product_id: "p2",
            status: "low",
            status_label: "Stock Bajo",
            stock: 2,
            total_cost: 60,
            total_sale: 90,
            suggested_qty: 10,
          }),
        ],
        error: null,
      });

      const result = await fetchInventoryReportData("ALL");

      expect(result.items[0]).toMatchObject({
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
      });
      expect(result.items[0].estimatedInvestment).toBe(0);
      expect(result.items[1].estimatedInvestment).toBe(10 * 30);
    });

    it("aplica defaults para campos ausentes", async () => {
      supabase.rpc.mockResolvedValue({
        data: [
          inventoryRow({
            barcode: null,
            product_name: null,
            department_name: null,
            stock: null,
            total_cost: null,
            total_sale: null,
          }),
        ],
        error: null,
      });

      const [item] = (await fetchInventoryReportData("ALL")).items;

      expect(item.barcode).toBe("");
      expect(item.name).toBe("Sin nombre");
      expect(item.departmentName).toBe("Sin departamento");
      expect(item.stock).toBe(0);
      expect(item.total_cost).toBe(0);
      expect(item.total_sale).toBe(0);
      expect(item.estimatedInvestment).toBe(0);
    });

    it("consolida KPIs excluyendo inventario no controlado y sin stock", async () => {
      supabase.rpc.mockResolvedValue({
        data: [
          inventoryRow({
            product_id: "p-optimal",
            status: "optimal",
            stock: 20,
            total_cost: 600,
            total_sale: 900,
            suggested_qty: 0,
          }),
          inventoryRow({
            product_id: "p-low",
            status: "low",
            stock: 2,
            total_cost: 60,
            total_sale: 90,
            suggested_qty: 10,
          }),
          inventoryRow({
            product_id: "p-exhausted",
            status: "exhausted",
            stock: 0,
            total_cost: 0,
            total_sale: 0,
            suggested_qty: 15,
            cost_price: 20,
          }),
          inventoryRow({
            product_id: "p-untracked",
            tracks_inventory: false,
            status: "optimal",
            stock: 5,
            total_cost: 50,
            total_sale: 80,
          }),
        ],
        error: null,
      });

      const result = await fetchInventoryReportData("ALL");

      expect(result.kpis).toMatchObject({
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
      expect(result.kpis.profitMargin).toBeCloseTo(33.33, 1);
    });

    it("agrupa por departamento y ordena por valor al costo", async () => {
      supabase.rpc.mockResolvedValue({
        data: [
          inventoryRow({
            product_id: "p1",
            department_id: "dp1",
            department_name: "Alimentos",
            stock: 20,
            total_cost: 600,
            total_sale: 900,
          }),
          inventoryRow({
            product_id: "p2",
            department_id: "dp2",
            department_name: "Farmacia",
            stock: 10,
            total_cost: 100,
            total_sale: 150,
          }),
        ],
        error: null,
      });

      const result = await fetchInventoryReportData("ALL");

      expect(result.byDepartment[0].name).toBe("Alimentos");
      expect(result.byDepartment[0].percentage).toBeCloseTo(85.71, 1);
      expect(result.byDepartment[1].name).toBe("Farmacia");
      expect(result.byDepartment[1].percentage).toBeCloseTo(14.28, 1);
    });

    it("separa reorderSugerencias y productos agotados", async () => {
      supabase.rpc.mockResolvedValue({
        data: [
          inventoryRow({
            product_id: "p-optimal",
            status: "optimal",
            stock: 20,
            suggested_qty: 0,
          }),
          inventoryRow({
            product_id: "p-low",
            status: "low",
            stock: 2,
            suggested_qty: 10,
          }),
          inventoryRow({
            product_id: "p-exhausted",
            status: "exhausted",
            stock: 0,
            suggested_qty: 15,
          }),
          inventoryRow({
            product_id: "p-untracked-low",
            tracks_inventory: false,
            status: "low",
            stock: 1,
            suggested_qty: 5,
          }),
        ],
        error: null,
      });

      const result = await fetchInventoryReportData("ALL");

      expect(result.reorderSuggestions.map((i) => i.id)).toEqual([
        "p-exhausted",
        "p-low",
      ]);
      expect(result.exhaustedProducts.map((i) => i.id)).toEqual([
        "p-exhausted",
      ]);
    });

    it("genera departamentos unicos para el filtro", async () => {
      supabase.rpc.mockResolvedValue({
        data: [
          inventoryRow({
            product_id: "p1",
            department_id: "dp1",
            department_name: "Alimentos",
          }),
          inventoryRow({
            product_id: "p2",
            department_id: "dp2",
            department_name: "Farmacia",
          }),
          inventoryRow({
            product_id: "p3",
            department_id: "dp1",
            department_name: "Alimentos",
          }),
        ],
        error: null,
      });

      const result = await fetchInventoryReportData("ALL");

      expect(result.departments).toEqual([
        { id: "dp1", name: "Alimentos" },
        { id: "dp2", name: "Farmacia" },
      ]);
    });

    it("relanza el error si la RPC falla", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      supabase.rpc.mockResolvedValue({
        data: null,
        error: { message: "boom" },
      });

      await expect(fetchInventoryReportData("ALL")).rejects.toMatchObject({
        message: "boom",
      });
      spy.mockRestore();
    });
  });
});