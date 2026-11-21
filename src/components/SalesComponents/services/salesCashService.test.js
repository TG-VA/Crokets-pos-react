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
import { getAvailableCash } from "./salesCashService";

/*
  El doble corta cada respuesta en 2 filas y paginatedQuery usa paginas de 2:
  las 5 ventas, 3 cancelaciones y 3 devoluciones de la sesion ocupan varias
  paginas. Sin paginar, el efectivo disponible ignoraria las filas restantes.
*/

const OPENED_AT = "2026-11-21T09:00:00Z";
const CASH = { affects_cash: true };
const CARD = { affects_cash: false };

const scope = { branch_id: "b-1", user_id: "u-1" };

const sales = Array.from({ length: 5 }, (_, index) => ({
  id: buildId("s", index),
  ...scope,
  status: "completed",
  created_at: `2026-11-21T1${index}:00:00Z`,
  sale_payments: [
    { amount: 100, currency: "MXN", exchange_rate: 1, payment_methods: CASH },
    { amount: 10, currency: "USD", exchange_rate: 18, payment_methods: CASH },
    { amount: 50, currency: "MXN", exchange_rate: 1, payment_methods: CARD },
  ],
}));

const canceledSales = [0, 1, 2].map((index) => ({
  id: buildId("cs", index),
  ...scope,
  refund_amount: 20,
  canceled_at: `2026-11-21T1${index}:30:00Z`,
  payment_methods: index === 2 ? CARD : CASH,
}));

const saleReturns = [0, 1, 2].map((index) => ({
  id: buildId("sr", index),
  ...scope,
  total_refund: 5,
  created_at: `2026-11-21T1${index}:45:00Z`,
  payment_methods: CASH,
}));

describe("salesCashService", () => {
  let fake;

  beforeEach(() => {
    fake = createFakePostgrest({
      cash_register_sessions: [
        { id: "cs-1", ...scope, opening_amount: 500, opened_at: OPENED_AT },
      ],
      cash_movements: [
        { id: "m-1", session_id: "cs-1", movement_type: "entrada", amount: 30 },
        { id: "m-2", session_id: "cs-1", movement_type: "salida", amount: 10 },
      ],
      sales,
      canceled_sales: canceledSales,
      sale_returns: saleReturns,
    });
    supabase.from.mockImplementation(fake.from);
  });

  it("suma todas las ventas, cancelaciones y devoluciones de la sesion", async () => {
    const available = await getAvailableCash({ sessionId: "cs-1" });

    // 500 + 30 - 10 + 5 * (100 + 10 * 18) - 2 * 20 - 3 * 5
    expect(available).toBe(1865);
    expect(
      fake.calls.filter((call) => call.table === "sales").length
    ).toBeGreaterThan(1);
  });

  it("lanza el error de una pagina de ventas", async () => {
    const pageError = { message: "boom" };
    supabase.from.mockImplementation((table) => {
      if (table !== "sales") return fake.from(table);
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        gte: () => query,
        order: () => query,
        limit: () => Promise.resolve({ data: null, error: pageError }),
      };
      return query;
    });

    await expect(getAvailableCash({ sessionId: "cs-1" })).rejects.toBe(
      pageError
    );
  });
});
