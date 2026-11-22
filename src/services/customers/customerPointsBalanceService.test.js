import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("../supabase/paginatedQuery", async (importOriginal) => {
  const { withSmallPages } =
    await import("../supabase/fakePostgrest.testUtils");
  return withSmallPages(await importOriginal());
});

import { supabase } from "../../lib/supabaseClient";
import {
  buildId,
  createFakePostgrest,
} from "../supabase/fakePostgrest.testUtils";
import {
  fetchCustomerPointsBalance,
  fetchPointsBalanceByCustomer,
} from "./customerPointsBalanceService";

/*
  El doble corta cada respuesta en 2 filas: un saldo de 4 movimientos leido sin
  paginar sumaria solo los 2 primeros.
*/

const buildMovement = (index, customerId, points) => ({
  id: buildId("m", index),
  customer_id: customerId,
  points,
});

describe("customerPointsBalanceService", () => {
  let fake;

  beforeEach(() => {
    fake = createFakePostgrest({
      customer_points: [
        buildMovement(0, "c-1", 100),
        buildMovement(1, "c-1", -30),
        buildMovement(2, "c-1", "15"),
        buildMovement(3, "c-1", null),
        buildMovement(4, "c-2", 40),
        buildMovement(5, "c-2", -50),
        buildMovement(6, "c-3", 7),
      ],
    });
    supabase.from.mockImplementation(fake.from);
  });

  it("suma todas las paginas de movimientos por cliente", async () => {
    const balances = await fetchPointsBalanceByCustomer(["c-1", "c-2", "c-9"]);

    expect(balances).toEqual({ "c-1": 85, "c-2": -10 });
  });

  it("no consulta con lista vacia y descarta ids repetidos o nulos", async () => {
    expect(await fetchPointsBalanceByCustomer([])).toEqual({});
    expect(fake.from).not.toHaveBeenCalled();

    expect(await fetchPointsBalanceByCustomer(["c-3", null, "c-3"])).toEqual({
      "c-3": 7,
    });
  });

  it("devuelve el saldo de un cliente, 0 sin movimientos o sin id", async () => {
    expect(await fetchCustomerPointsBalance("c-1")).toBe(85);
    expect(await fetchCustomerPointsBalance("c-9")).toBe(0);
    expect(await fetchCustomerPointsBalance(null)).toBe(0);
  });

  it("lanza el error de una pagina en vez de devolver un saldo parcial", async () => {
    const pageError = { message: "boom" };
    supabase.from.mockImplementation(() => {
      const query = {
        select: () => query,
        in: () => query,
        order: () => query,
        gt: () => query,
        limit: () => Promise.resolve({ data: null, error: pageError }),
      };
      return query;
    });

    await expect(fetchCustomerPointsBalance("c-1")).rejects.toBe(pageError);
  });
});
