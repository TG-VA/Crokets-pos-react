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
let nextResults = [];

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: {
    from: (table) => {
      if (fakeFrom) return fakeFrom(table);

      fromCalls.push(table);

      return buildChain(nextResults.shift() ?? { data: [], error: null });
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

import {
  fetchActiveBranches,
  fetchInvoicesHistory,
} from "./invoicesHistoryReportService";

const lastChain = () => chains[chains.length - 1];

describe("invoicesHistoryReportService", () => {
  beforeEach(() => {
    fakeFrom = null;
    fromCalls.length = 0;
    chains.length = 0;
    nextResults = [];
  });

  describe("fetchActiveBranches", () => {
    it("trae solo las sucursales operativas activas, ordenadas por nombre", async () => {
      nextResults = [{ data: [{ id: 1, name: "Uno" }], error: null }];

      const branches = await fetchActiveBranches();

      expect(fromCalls).toEqual(["branches"]);
      expect(lastChain().eq).toHaveBeenCalledWith("branch_type", "operational");
      expect(lastChain().eq).toHaveBeenCalledWith("is_active", true);
      expect(lastChain().order).toHaveBeenCalledWith("name", {
        ascending: true,
      });
      expect(branches).toEqual([{ id: 1, name: "Uno" }]);
    });

    it("devuelve arreglo vacio cuando no hay sucursales", async () => {
      nextResults = [{ data: null, error: null }];

      expect(await fetchActiveBranches()).toEqual([]);
    });

    it("propaga el error de la consulta", async () => {
      nextResults = [{ data: null, error: new Error("branches boom") }];

      await expect(fetchActiveBranches()).rejects.toThrow("branches boom");
    });
  });

  describe("fetchInvoicesHistory", () => {
    const baseArgs = {
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      branchFilter: "current",
      currentBranchId: 3,
    };

    it("acota el rango con el dia completo", async () => {
      nextResults = [{ data: [{ id: "inv1" }], error: null }];

      const invoices = await fetchInvoicesHistory(baseArgs);

      expect(fromCalls).toEqual(["invoices"]);
      expect(lastChain().gte).toHaveBeenCalledWith(
        "created_at",
        "2026-03-01T00:00:00"
      );
      expect(lastChain().lte).toHaveBeenCalledWith(
        "created_at",
        "2026-03-31T23:59:59"
      );
      expect(invoices).toEqual([{ id: "inv1" }]);
    });

    it("lee todas las paginas del rango y ordena de mas reciente a mas antigua", async () => {
      const buildInvoice = (index, createdAt, branchId = 3) => ({
        id: buildId("inv", index),
        branch_id: branchId,
        created_at: createdAt,
      });
      const fake = createFakePostgrest({
        invoices: [
          buildInvoice(0, "2026-03-02T10:00:00"),
          buildInvoice(1, "2026-03-20T10:00:00"),
          buildInvoice(2, "2026-03-10T10:00:00"),
          buildInvoice(3, "2026-03-15T10:00:00", 9),
          buildInvoice(4, "2026-03-05T10:00:00"),
          buildInvoice(5, "2026-04-01T10:00:00"),
        ],
      });
      fakeFrom = fake.from;

      const invoices = await fetchInvoicesHistory(baseArgs);

      expect(invoices.map((invoice) => invoice.id)).toEqual(
        [1, 2, 4, 0].map((index) => buildId("inv", index))
      );
    });

    it("filtra por la sucursal de la sesion cuando el selector es `current`", async () => {
      nextResults = [{ data: [], error: null }];

      await fetchInvoicesHistory(baseArgs);

      expect(lastChain().eq).toHaveBeenCalledWith("branch_id", 3);
    });

    it("no filtra por sucursal cuando el selector es `all`", async () => {
      nextResults = [{ data: [], error: null }];

      await fetchInvoicesHistory({ ...baseArgs, branchFilter: "all" });

      expect(lastChain().eq).not.toHaveBeenCalled();
    });

    it("trata cualquier otro valor como un id concreto de sucursal", async () => {
      nextResults = [{ data: [], error: null }];

      await fetchInvoicesHistory({ ...baseArgs, branchFilter: "7" });

      expect(lastChain().eq).toHaveBeenCalledWith("branch_id", "7");
    });

    it("devuelve arreglo vacio cuando el rango no tiene facturas", async () => {
      nextResults = [{ data: null, error: null }];

      expect(await fetchInvoicesHistory(baseArgs)).toEqual([]);
    });

    it("propaga el error de la consulta", async () => {
      nextResults = [{ data: null, error: new Error("report boom") }];

      await expect(fetchInvoicesHistory(baseArgs)).rejects.toThrow(
        "report boom"
      );
    });
  });
});
