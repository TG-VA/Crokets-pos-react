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

let nextResults = [];

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: {
    from: (table) => {
      fromCalls.push(table);

      return buildChain(nextResults.shift() ?? { data: [], error: null });
    },
  },
}));

import {
  fetchActiveBranches,
  fetchInvoicesHistory,
} from "./invoicesHistoryReportService";

const lastChain = () => chains[chains.length - 1];

describe("invoicesHistoryReportService", () => {
  beforeEach(() => {
    fromCalls.length = 0;
    chains.length = 0;
    nextResults = [];
  });

  describe("fetchActiveBranches", () => {
    it("trae solo las sucursales activas, ordenadas por nombre", async () => {
      nextResults = [{ data: [{ id: 1, name: "Uno" }], error: null }];

      const branches = await fetchActiveBranches();

      expect(fromCalls).toEqual(["branches"]);
      expect(lastChain().eq).toHaveBeenCalledWith("status", true);
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

    it("acota el rango con el dia completo y ordena de mas reciente a mas antigua", async () => {
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
      expect(lastChain().order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
      expect(invoices).toEqual([{ id: "inv1" }]);
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
