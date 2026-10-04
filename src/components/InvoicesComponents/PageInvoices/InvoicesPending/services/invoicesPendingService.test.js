import { describe, it, expect, beforeEach, vi } from "vitest";

const fromCalls = [];
const chains = [];

const buildChain = (result) => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (resolve) => resolve(result),
  };

  chains.push(builder);

  return builder;
};

let nextResult = { data: [], error: null };

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: {
    from: (table) => {
      fromCalls.push(table);

      return buildChain(nextResult);
    },
  },
}));

import { fetchCompletedBranchSales } from "./invoicesPendingService";

const lastChain = () => chains[chains.length - 1];

describe("invoicesPendingService", () => {
  beforeEach(() => {
    fromCalls.length = 0;
    chains.length = 0;
    nextResult = { data: [], error: null };
  });

  describe("fetchCompletedBranchSales", () => {
    it("trae las ventas completadas de la sucursal, mas recientes primero", async () => {
      nextResult = { data: [{ id: "s1" }], error: null };

      const sales = await fetchCompletedBranchSales({ branchId: 3 });

      expect(fromCalls).toEqual(["sales"]);
      expect(lastChain().eq).toHaveBeenCalledWith("branch_id", 3);
      expect(lastChain().eq).toHaveBeenCalledWith("status", "completed");
      expect(lastChain().order).toHaveBeenCalledWith("sale_date", {
        ascending: false,
      });
      expect(sales).toEqual([{ id: "s1" }]);
    });

    it("acota al dia cuando se pasa el rango", async () => {
      await fetchCompletedBranchSales({
        branchId: 3,
        dayRange: {
          start: "2026-03-15T05:00:00.000Z",
          end: "2026-03-16T04:59:59.999Z",
        },
      });

      expect(lastChain().gte).toHaveBeenCalledWith(
        "sale_date",
        "2026-03-15T05:00:00.000Z"
      );
      expect(lastChain().lte).toHaveBeenCalledWith(
        "sale_date",
        "2026-03-16T04:59:59.999Z"
      );
    });

    it("no acota fechas cuando la vista pide el listado completo", async () => {
      await fetchCompletedBranchSales({ branchId: 3, dayRange: null });

      expect(lastChain().gte).not.toHaveBeenCalled();
      expect(lastChain().lte).not.toHaveBeenCalled();
    });

    it("devuelve arreglo vacio cuando la sucursal no tiene ventas", async () => {
      nextResult = { data: null, error: null };

      expect(await fetchCompletedBranchSales({ branchId: 3 })).toEqual([]);
    });

    it("propaga el error de la consulta", async () => {
      nextResult = { data: null, error: new Error("sales boom") };

      await expect(fetchCompletedBranchSales({ branchId: 3 })).rejects.toThrow(
        "sales boom"
      );
    });
  });
});
