import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock(
  "../../../../../services/supabase/paginatedQuery",
  async (importOriginal) => {
    const { withSmallPages } =
      await import("../../../../../services/supabase/fakePostgrest.testUtils");
    return withSmallPages(await importOriginal());
  }
);

import { supabase } from "../../../../../lib/supabaseClient";
import {
  buildId,
  createFakePostgrest,
} from "../../../../../services/supabase/fakePostgrest.testUtils";
import {
  fetchPointsCustomers,
  searchFiscalCustomerByPhone,
} from "./customersListService";

/*
  El doble corta cada respuesta en 2 filas, como PostgREST con max-rows: sin
  paginar, la lista llegaria truncada.
*/

const buildCustomer = (index, overrides = {}) => ({
  id: buildId("c", index),
  name: `Cliente ${index}`,
  status: true,
  is_points_customer: true,
  ...overrides,
});

describe("customersListService", () => {
  let fake;

  beforeEach(() => {
    const customers = [0, 1, 2, 3, 4].map((index) => buildCustomer(index));
    fake = createFakePostgrest({
      customers: [
        ...customers,
        buildCustomer(9, { is_points_customer: false }),
      ],
    });
    supabase.from.mockImplementation(fake.from);
  });

  it("fetchPointsCustomers lee todas las paginas de clientes de puntos", async () => {
    const result = await fetchPointsCustomers();

    expect(result.map((customer) => customer.id)).toEqual(
      [0, 1, 2, 3, 4].map((index) => buildId("c", index))
    );
    expect(fake.calls.length).toBeGreaterThan(1);
  });

  it("fetchPointsCustomers lanza el error de una pagina", async () => {
    const pageError = { message: "boom" };
    supabase.from.mockImplementation(() => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        gt: () => query,
        limit: () => Promise.resolve({ data: null, error: pageError }),
      };
      return query;
    });

    await expect(fetchPointsCustomers()).rejects.toBe(pageError);
  });

  describe("searchFiscalCustomerByPhone", () => {
    // Query que resuelve con `result` al pedir `.limit()`; sin `.maybeSingle()`.
    const mockFiscalQuery = (result) => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        or: vi.fn(() => query),
        limit: vi.fn(() => Promise.resolve(result)),
      };
      supabase.from.mockImplementation(() => query);
      return query;
    };

    it("devuelve el primero cuando dos clientes fiscales comparten telefono", async () => {
      const first = { id: "f1", phone: "5512345678" };
      const query = mockFiscalQuery({
        data: [first, { id: "f2", phone: "5512345678" }],
        error: null,
      });

      expect(await searchFiscalCustomerByPhone("5512345678")).toBe(first);
      expect(query.limit).toHaveBeenCalledWith(1);
    });

    it("devuelve null sin coincidencias", async () => {
      mockFiscalQuery({ data: [], error: null });

      expect(await searchFiscalCustomerByPhone("5512345678")).toBeNull();
    });

    it("lanza el error de la consulta", async () => {
      const queryError = { message: "boom" };
      mockFiscalQuery({ data: null, error: queryError });

      await expect(searchFiscalCustomerByPhone("5512345678")).rejects.toBe(
        queryError
      );
    });
  });
});
