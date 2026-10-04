import { describe, it, expect, beforeEach, vi } from "vitest";

const fromCalls = [];
const chains = [];

const buildChain = (result) => {
  const builder = {
    select: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
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

import {
  fetchInvoiceCustomers,
  searchPointsCustomerByPhone,
  shouldRefreshOnCustomerChange,
  updateInvoiceCustomerStatus,
} from "./invoiceCustomersService";

const lastChain = () => chains[chains.length - 1];

describe("invoiceCustomersService", () => {
  beforeEach(() => {
    fromCalls.length = 0;
    chains.length = 0;
    nextResult = { data: [], error: null };
  });

  describe("fetchInvoiceCustomers", () => {
    it("trae solo los clientes con datos fiscales, activos primero", async () => {
      nextResult = { data: [{ id: "c1" }], error: null };

      const customers = await fetchInvoiceCustomers();

      expect(fromCalls).toEqual(["customers"]);
      expect(lastChain().eq).toHaveBeenCalledWith("is_billing_customer", true);
      expect(lastChain().order).toHaveBeenCalledWith("status", {
        ascending: false,
        nullsFirst: false,
      });
      expect(lastChain().order).toHaveBeenCalledWith("razon_social", {
        ascending: true,
        nullsFirst: false,
      });
      expect(customers).toEqual([{ id: "c1" }]);
    });

    it("devuelve arreglo vacio cuando no hay clientes fiscales", async () => {
      nextResult = { data: null, error: null };

      expect(await fetchInvoiceCustomers()).toEqual([]);
    });

    it("propaga el error de la consulta", async () => {
      nextResult = { data: null, error: new Error("customers boom") };

      await expect(fetchInvoiceCustomers()).rejects.toThrow("customers boom");
    });
  });

  describe("searchPointsCustomerByPhone", () => {
    it("busca el cliente de puntos con el mismo telefono que aun no es fiscal", async () => {
      nextResult = { data: { id: "c9" }, error: null };

      const found = await searchPointsCustomerByPhone("5512345678");

      expect(fromCalls).toEqual(["customers"]);
      expect(lastChain().eq).toHaveBeenCalledWith("phone", "5512345678");
      expect(lastChain().eq).toHaveBeenCalledWith("is_points_customer", true);
      expect(lastChain().or).toHaveBeenCalledWith(
        "is_billing_customer.is.null,is_billing_customer.eq.false"
      );
      expect(found).toEqual({ id: "c9" });
    });

    it("devuelve null cuando el telefono no es de un cliente de puntos", async () => {
      nextResult = { data: null, error: null };

      expect(await searchPointsCustomerByPhone("5512345678")).toBeNull();
    });

    it("propaga el error de la consulta", async () => {
      nextResult = { data: null, error: new Error("points boom") };

      await expect(searchPointsCustomerByPhone("5512345678")).rejects.toThrow(
        "points boom"
      );
    });
  });

  describe("updateInvoiceCustomerStatus", () => {
    it("cambia el estado y sella la actualizacion", async () => {
      await updateInvoiceCustomerStatus({
        customerId: "c1",
        nextStatus: false,
      });

      const updateArg = lastChain().update.mock.calls[0][0];

      expect(updateArg.status).toBe(false);
      expect(Number.isNaN(Date.parse(updateArg.updated_at))).toBe(false);
      expect(lastChain().eq).toHaveBeenCalledWith("id", "c1");
    });

    it("reactiva el cliente cuando nextStatus es true", async () => {
      await updateInvoiceCustomerStatus({
        customerId: "c1",
        nextStatus: true,
      });

      expect(lastChain().update.mock.calls[0][0].status).toBe(true);
    });

    it("propaga el error del update", async () => {
      nextResult = { data: null, error: new Error("update boom") };

      await expect(
        updateInvoiceCustomerStatus({ customerId: "c1", nextStatus: false })
      ).rejects.toThrow("update boom");
    });
  });

  describe("shouldRefreshOnCustomerChange", () => {
    it("recarga cuando el evento toca a un cliente fiscal", () => {
      expect(
        shouldRefreshOnCustomerChange({ new: { is_billing_customer: true } })
      ).toBe(true);
    });

    it("recarga cuando el evento deja de ser fiscal", () => {
      expect(
        shouldRefreshOnCustomerChange({ old: { is_billing_customer: true } })
      ).toBe(true);
    });

    it("recarga cuando el evento toca a un cliente de puntos", () => {
      expect(
        shouldRefreshOnCustomerChange({ new: { is_points_customer: true } })
      ).toBe(true);
    });

    it("ignora las altas de la tabla que no aparecen en esta pantalla", () => {
      expect(
        shouldRefreshOnCustomerChange({
          new: { is_billing_customer: false, is_points_customer: false },
        })
      ).toBe(false);
    });

    it("tolera un payload vacio", () => {
      expect(shouldRefreshOnCustomerChange(null)).toBe(false);
      expect(shouldRefreshOnCustomerChange({})).toBe(false);
    });
  });
});
