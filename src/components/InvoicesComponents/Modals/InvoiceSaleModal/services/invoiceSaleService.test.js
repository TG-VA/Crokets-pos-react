import { describe, it, expect, beforeEach, vi } from "vitest";

const fromCalls = [];

const buildChain = (result) => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (resolve) => resolve(result),
  };

  return builder;
};

let nextResults = [];
let lastChain = null;

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: {
    from: (table) => {
      fromCalls.push(table);

      const result = nextResults.shift() ?? { data: [], error: null };
      lastChain = buildChain(result);

      return lastChain;
    },
  },
}));

import {
  fetchExistingInvoiceId,
  fetchFiscalCustomers,
  fetchSaleInvoiceData,
  insertInvoice,
  insertInvoiceItems,
  insertInvoicePayments,
} from "./invoiceSaleService";

describe("invoiceSaleService", () => {
  beforeEach(() => {
    fromCalls.length = 0;
    nextResults = [];
    lastChain = null;
  });

  describe("fetchSaleInvoiceData", () => {
    it("trae conceptos y pagos de la venta", async () => {
      nextResults = [
        { data: [{ id: 1 }], error: null },
        { data: [{ id: 2 }], error: null },
      ];

      const result = await fetchSaleInvoiceData("s1");

      expect(fromCalls).toEqual(["sale_details", "sale_payments"]);
      expect(result).toEqual({
        saleDetails: [{ id: 1 }],
        salePayments: [{ id: 2 }],
      });
    });

    it("devuelve arreglos vacios cuando la venta no trae filas", async () => {
      nextResults = [
        { data: null, error: null },
        { data: null, error: null },
      ];

      expect(await fetchSaleInvoiceData("s1")).toEqual({
        saleDetails: [],
        salePayments: [],
      });
    });

    it("propaga el error de la consulta de conceptos", async () => {
      nextResults = [{ data: null, error: new Error("details boom") }];

      await expect(fetchSaleInvoiceData("s1")).rejects.toThrow("details boom");
    });

    it("propaga el error de la consulta de pagos", async () => {
      nextResults = [
        { data: null, error: null },
        { data: null, error: new Error("payments boom") },
      ];

      await expect(fetchSaleInvoiceData("s1")).rejects.toThrow("payments boom");
    });
  });

  describe("fetchFiscalCustomers", () => {
    it("filtra por cliente fiscal activo y ordena por razon social", async () => {
      nextResults = [{ data: [{ id: "c1" }], error: null }];

      const customers = await fetchFiscalCustomers();

      expect(fromCalls).toEqual(["customers"]);
      expect(lastChain.eq).toHaveBeenCalledWith("is_billing_customer", true);
      expect(lastChain.eq).toHaveBeenCalledWith("status", true);
      expect(lastChain.order).toHaveBeenCalledWith("razon_social", {
        ascending: true,
      });
      expect(customers).toEqual([{ id: "c1" }]);
    });

    it("propaga el error de la consulta", async () => {
      nextResults = [{ data: null, error: new Error("boom") }];

      await expect(fetchFiscalCustomers()).rejects.toThrow("boom");
    });
  });

  describe("fetchExistingInvoiceId", () => {
    it("devuelve el id cuando la venta ya fue facturada", async () => {
      nextResults = [{ data: { id: "inv1" }, error: null }];

      expect(await fetchExistingInvoiceId("s1")).toBe("inv1");
    });

    it("devuelve null cuando la venta no tiene factura", async () => {
      nextResults = [{ data: null, error: null }];

      expect(await fetchExistingInvoiceId("s1")).toBeNull();
    });

    it("propaga el error de la consulta", async () => {
      nextResults = [{ data: null, error: new Error("boom") }];

      await expect(fetchExistingInvoiceId("s1")).rejects.toThrow("boom");
    });
  });

  describe("insertInvoice", () => {
    it("inserta la cabecera y devuelve el id generado", async () => {
      nextResults = [{ data: { id: "inv1" }, error: null }];

      const payload = { sale_id: "s1" };
      const id = await insertInvoice(payload);

      expect(fromCalls).toEqual(["invoices"]);
      expect(lastChain.insert).toHaveBeenCalledWith(payload);
      expect(id).toBe("inv1");
    });

    it("propaga el error del insert para no dejar conceptos huerfanos", async () => {
      nextResults = [{ data: null, error: new Error("insert boom") }];

      await expect(insertInvoice({ sale_id: "s1" })).rejects.toThrow(
        "insert boom"
      );
    });
  });

  describe("insertInvoiceItems", () => {
    it("inserta el lote de conceptos", async () => {
      nextResults = [{ data: null, error: null }];

      await insertInvoiceItems([{ invoice_id: "inv1" }]);

      expect(fromCalls).toEqual(["invoice_items"]);
      expect(lastChain.insert).toHaveBeenCalledTimes(1);
    });

    it("propaga el error del lote", async () => {
      nextResults = [{ data: null, error: new Error("items boom") }];

      await expect(insertInvoiceItems([])).rejects.toThrow("items boom");
    });
  });

  describe("insertInvoicePayments", () => {
    it("inserta los pagos de la factura", async () => {
      nextResults = [{ data: null, error: null }];

      await insertInvoicePayments([{ invoice_id: "inv1" }]);

      expect(fromCalls).toEqual(["invoice_payments"]);
    });

    it("propaga el error del insert de pagos", async () => {
      nextResults = [{ data: null, error: new Error("payments boom") }];

      await expect(insertInvoicePayments([])).rejects.toThrow("payments boom");
    });
  });
});
