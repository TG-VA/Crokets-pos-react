import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("../../../services/supabase/paginatedQuery", async (importOriginal) => {
  const { withSmallPages } =
    await import("../../../services/supabase/fakePostgrest.testUtils");
  return withSmallPages(await importOriginal());
});

import { supabase } from "../../../lib/supabaseClient";
import {
  buildId,
  createFakePostgrest,
} from "../../../services/supabase/fakePostgrest.testUtils";
import {
  buildCustomerPointsMaps,
  fetchSalesRelatedData,
  fetchTicketsBatch,
} from "./salesHistoryService";

/*
  El doble corta cada respuesta en 2 filas y withSmallPages parte el .in() en
  lotes de 2: pocas filas bastan para cruzar varias paginas y lotes.
*/

const START = "2026-03-15T05:00:00.000Z";
const END = "2026-03-16T04:59:59.999Z";

const buildSale = (index, saleDate, overrides = {}) => ({
  id: buildId("s", index),
  branch_id: "b-1",
  user_id: "u-1",
  sale_date: saleDate,
  ...overrides,
});

describe("salesHistoryService", () => {
  let fake;

  beforeEach(() => {
    const saleIds = [0, 1, 2].map((index) => buildId("s", index));

    fake = createFakePostgrest({
      sales: [
        buildSale(0, "2026-03-15T10:00:00.000Z"),
        buildSale(1, "2026-03-15T18:00:00.000Z"),
        buildSale(2, "2026-03-15T12:00:00.000Z"),
        buildSale(3, "2026-03-15T15:00:00.000Z", { user_id: "u-2" }),
        buildSale(4, "2026-03-14T10:00:00.000Z"),
        buildSale(5, "2026-03-15T11:00:00.000Z", { branch_id: "b-2" }),
      ],
      sale_details: [0, 1, 2, 3, 4].map((index) => ({
        id: buildId("d", index),
        sale_id: saleIds[0],
        quantity: 1,
      })),
      users: [{ id: "u-1", username: "ana" }],
      customers: [{ id: "c-1", name: "Cliente" }],
      sale_payments: [0, 1, 2].map((index) => ({
        id: buildId("p", index),
        sale_id: saleIds[index],
        amount: 10,
      })),
      canceled_sales: [],
      sale_returns: [],
      customer_points: [
        ...[0, 1, 2].map((index) => ({
          id: buildId("cp", index),
          customer_id: "c-1",
          related_sale_id: saleIds[0],
          source: "sale",
          points: 10,
        })),
        {
          id: buildId("cp", 3),
          customer_id: "c-1",
          related_sale_id: saleIds[1],
          source: "reward",
          points: -5,
        },
        {
          id: buildId("cp", 4),
          customer_id: "c-1",
          related_sale_id: null,
          source: "adjustment",
          points: 100,
        },
      ],
    });
    supabase.from.mockImplementation(fake.from);
  });

  it("fetchTicketsBatch lee todas las paginas del dia y ordena por sale_date descendente", async () => {
    const sales = await fetchTicketsBatch("b-1", START, END, "u-1");

    expect(sales.map((sale) => sale.id)).toEqual(
      [1, 2, 0].map((index) => buildId("s", index))
    );
  });

  it("fetchSalesRelatedData pagina cada lote del .in()", async () => {
    const saleIds = [0, 1, 2].map((index) => buildId("s", index));

    const related = await fetchSalesRelatedData(saleIds, ["u-1"], ["c-1"]);

    expect(related.details).toHaveLength(5);
    expect(related.payments).toHaveLength(3);
    expect(related.users).toEqual([{ id: "u-1", username: "ana" }]);
  });

  it("buildCustomerPointsMaps suma todas las paginas de puntos y de saldo", async () => {
    const saleIds = [0, 1].map((index) => buildId("s", index));

    const maps = await buildCustomerPointsMaps({
      saleIds,
      customerIds: ["c-1"],
    });

    expect(maps.pointsBySale).toEqual({ [saleIds[0]]: 30 });
    expect(maps.rewardPointsBySale).toEqual({ [saleIds[1]]: 5 });
    expect(maps.balanceByCustomer).toEqual({ "c-1": 125 });
  });
});
