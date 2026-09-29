import { describe, it, expect, beforeEach, vi } from "vitest";

const fromCalls = [];
const chains = [];

const buildChain = (result) => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
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

import { fetchInvoiceItems } from "./invoicesHistoryDetailService";

const lastChain = () => chains[chains.length - 1];

describe("invoicesHistoryDetailService", () => {
  beforeEach(() => {
    fromCalls.length = 0;
    chains.length = 0;
    nextResult = { data: [], error: null };
  });

  describe("fetchInvoiceItems", () => {
    it("trae los conceptos de la factura en orden de emision", async () => {
      nextResult = { data: [{ id: "i1" }], error: null };

      const items = await fetchInvoiceItems("inv1");

      expect(fromCalls).toEqual(["invoice_items"]);
      expect(lastChain().eq).toHaveBeenCalledWith("invoice_id", "inv1");
      expect(lastChain().order).toHaveBeenCalledWith("created_at", {
        ascending: true,
      });
      expect(items).toEqual([{ id: "i1" }]);
    });

    it("devuelve arreglo vacio cuando la factura no tiene conceptos", async () => {
      nextResult = { data: null, error: null };

      expect(await fetchInvoiceItems("inv1")).toEqual([]);
    });

    it("propaga el error de la consulta", async () => {
      nextResult = { data: null, error: new Error("items boom") };

      await expect(fetchInvoiceItems("inv1")).rejects.toThrow("items boom");
    });
  });
});
