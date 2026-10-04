import { describe, it, expect, beforeEach, vi } from "vitest";

const fromCalls = [];

const buildChain = (result) => {
  const builder = {
    select: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    update: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
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
  getFiscalCustomerErrorMessage,
  saveFiscalCustomer,
  searchFiscalCustomerCandidates,
} from "./fiscalCustomerService";

describe("fiscalCustomerService", () => {
  beforeEach(() => {
    fromCalls.length = 0;
    nextResults = [];
    lastChain = null;
  });

  describe("searchFiscalCustomerCandidates", () => {
    it("busca por los seis campos de la vista y acota a veinte resultados", async () => {
      nextResults = [{ data: [{ id: "c1", name: "CLIENTE" }], error: null }];

      const results = await searchFiscalCustomerCandidates("gode");

      expect(fromCalls).toEqual(["customers"]);
      expect(lastChain.or).toHaveBeenCalledWith(
        expect.stringContaining("phone.ilike.%gode%")
      );
      expect(lastChain.limit).toHaveBeenCalledWith(20);
      expect(results).toEqual([{ id: "c1", name: "CLIENTE" }]);
    });

    it("devuelve arreglo vacio cuando no hay coincidencias", async () => {
      nextResults = [{ data: null, error: null }];

      expect(await searchFiscalCustomerCandidates("zzz")).toEqual([]);
    });

    it("propaga el error de la consulta", async () => {
      nextResults = [{ data: null, error: new Error("boom") }];

      await expect(searchFiscalCustomerCandidates("gode")).rejects.toThrow(
        "boom"
      );
    });
  });

  describe("saveFiscalCustomer", () => {
    const payload = { rfc: "GODE561231GR8", is_billing_customer: true };

    it("actualiza cuando el cliente ya tiene id", async () => {
      nextResults = [{ data: null, error: null }];

      await saveFiscalCustomer({ customerId: "c1", payload });

      expect(fromCalls).toEqual(["customers"]);
      expect(lastChain.update).toHaveBeenCalledWith(payload);
      expect(lastChain.eq).toHaveBeenCalledWith("id", "c1");
      expect(lastChain.insert).not.toHaveBeenCalled();
    });

    it("inserta con `created_at` cuando es un alta", async () => {
      nextResults = [{ data: null, error: null }];

      await saveFiscalCustomer({ customerId: "", payload });

      expect(lastChain.insert).toHaveBeenCalledTimes(1);
      expect(lastChain.insert.mock.calls[0][0]).toMatchObject({
        ...payload,
      });
      expect(
        Number.isNaN(Date.parse(lastChain.insert.mock.calls[0][0].created_at))
      ).toBe(false);
    });

    it("propaga el error del update para que el hook muestre el aviso", async () => {
      nextResults = [{ data: null, error: new Error("update failed") }];

      await expect(
        saveFiscalCustomer({ customerId: "c1", payload })
      ).rejects.toThrow("update failed");
    });

    it("propaga el error del insert", async () => {
      nextResults = [{ data: null, error: new Error("insert failed") }];

      await expect(
        saveFiscalCustomer({ customerId: "", payload })
      ).rejects.toThrow("insert failed");
    });
  });

  describe("getFiscalCustomerErrorMessage", () => {
    it("traduce la violacion de unicidad de Postgres al mensaje de duplicado", () => {
      expect(getFiscalCustomerErrorMessage({ code: "23505" })).toBe(
        "Ya existe un cliente con ese RFC o correo."
      );
    });

    it("cubre el resto de errores con el mensaje generico", () => {
      expect(getFiscalCustomerErrorMessage({ code: "42501" })).toBe(
        "No se pudo guardar el cliente fiscal."
      );
      expect(getFiscalCustomerErrorMessage(null)).toBe(
        "No se pudo guardar el cliente fiscal."
      );
    });
  });
});
