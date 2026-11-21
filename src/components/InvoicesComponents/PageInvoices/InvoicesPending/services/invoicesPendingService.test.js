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
    gt: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (resolve) => resolve(result),
  };

  chains.push(builder);

  return builder;
};

// El caso de varias paginas desvia supabase.from al doble de PostgREST.
let fakeFrom = null;
let nextResult = { data: [], error: null };

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: {
    from: (table) => {
      if (fakeFrom) return fakeFrom(table);

      fromCalls.push(table);

      return buildChain(nextResult);
    },
  },
}));

vi.mock(
  "../../../../../services/supabase/paginatedQuery",
  async (importOriginal) => {
    const { withSmallPages } =
      await import("../../../../../services/supabase/fakePostgrest.testUtils");
    return withSmallPages(await importOriginal());
  }
);

import {
  buildId,
  createFakePostgrest,
} from "../../../../../services/supabase/fakePostgrest.testUtils";

import { fetchCompletedBranchSales } from "./invoicesPendingService";

const lastChain = () => chains[chains.length - 1];

describe("invoicesPendingService", () => {
  beforeEach(() => {
    fakeFrom = null;
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
      expect(sales).toEqual([{ id: "s1" }]);
    });

    it("sin rango lee todas las paginas y ordena por sale_date descendente", async () => {
      const buildSale = (index, saleDate, overrides = {}) => ({
        id: buildId("s", index),
        branch_id: 3,
        status: "completed",
        sale_date: saleDate,
        ...overrides,
      });
      const fake = createFakePostgrest({
        sales: [
          buildSale(0, "2026-01-01T00:00:00Z"),
          buildSale(1, "2026-01-04T00:00:00Z"),
          buildSale(2, "2026-01-03T00:00:00Z"),
          buildSale(3, "2026-01-05T00:00:00Z", { status: "canceled" }),
          buildSale(4, "2026-01-02T00:00:00Z"),
          buildSale(5, "2026-01-06T00:00:00Z", { branch_id: 9 }),
        ],
      });
      fakeFrom = fake.from;

      const sales = await fetchCompletedBranchSales({
        branchId: 3,
        dayRange: null,
      });

      expect(sales.map((sale) => sale.id)).toEqual(
        [1, 2, 4, 0].map((index) => buildId("s", index))
      );
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
