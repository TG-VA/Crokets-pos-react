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
  fetchPointsMovements,
} from "./customersListService";

/*
  El doble corta cada respuesta en 2 filas, como PostgREST con max-rows: sin
  paginar, la lista y los saldos llegarian truncados.
*/

const buildCustomer = (index, overrides = {}) => ({
  id: buildId("c", index),
  name: `Cliente ${index}`,
  status: true,
  is_points_customer: true,
  ...overrides,
});

const buildMovement = (index, customerId, points) => ({
  id: buildId("m", index),
  customer_id: customerId,
  points,
  movement_type: "earn",
});

describe("customersListService", () => {
  let fake;

  beforeEach(() => {
    const customers = [0, 1, 2, 3, 4].map((index) => buildCustomer(index));
    const movements = [
      buildMovement(0, customers[0].id, 10),
      buildMovement(1, customers[0].id, 20),
      buildMovement(2, customers[0].id, 30),
      buildMovement(3, customers[1].id, 5),
      buildMovement(4, customers[2].id, 7),
      buildMovement(5, customers[4].id, 9),
      buildMovement(6, "c-otro", 99),
    ];

    fake = createFakePostgrest({
      customers: [
        ...customers,
        buildCustomer(9, { is_points_customer: false }),
      ],
      customer_points: movements,
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

  it("fetchPointsMovements lee varias paginas por lote sin perder movimientos", async () => {
    const ids = [0, 1, 2, 3, 4].map((index) => buildId("c", index));

    const result = await fetchPointsMovements(ids);

    expect(result.map((row) => row.id).sort()).toEqual(
      [0, 1, 2, 3, 4, 5].map((index) => buildId("m", index))
    );
    expect(
      result
        .filter((row) => row.customer_id === ids[0])
        .reduce((sum, row) => sum + row.points, 0)
    ).toBe(60);
  });

  it("fetchPointsMovements no consulta con lista vacia", async () => {
    expect(await fetchPointsMovements([])).toEqual([]);
    expect(fake.from).not.toHaveBeenCalled();
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
});
