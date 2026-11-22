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
import { reverseCustomerPointsByPartialReturn } from "./returnsService";

/*
  El doble corta cada respuesta en 2 filas: el saldo de c-1 (+20, -8, -8, +1)
  ocupa dos paginas. Leer solo la primera daria 12 en lugar de 5.
*/

const SALE_ID = "sale-1";

const buildPoint = (index, points, overrides = {}) => ({
  id: buildId("cp", index),
  customer_id: "c-1",
  related_sale_id: null,
  source: "adjustment",
  points,
  ...overrides,
});

const settingsQuery = () => {
  const query = {
    select: () => query,
    eq: () => query,
    is: () => query,
    maybeSingle: () =>
      Promise.resolve({
        data: { setting_value: "50", is_active: true },
        error: null,
      }),
  };
  return query;
};

const reverse = () =>
  reverseCustomerPointsByPartialReturn({
    selectedTicket: { id: SALE_ID, total: 1000, totalReturned: 0 },
    totalRefund: 500,
    returnReason: "",
    user: { id: "u-1" },
    branch: { id: "b-1" },
  });

describe("reverseCustomerPointsByPartialReturn", () => {
  let fake;
  let inserted;

  beforeEach(() => {
    inserted = [];
    fake = createFakePostgrest({
      customer_points: [
        buildPoint(0, 20, { related_sale_id: SALE_ID, source: "sale" }),
        buildPoint(1, -8),
        buildPoint(2, -8),
        buildPoint(3, 1),
      ],
      sale_returns: [],
    });
    supabase.from.mockImplementation((table) => {
      if (table === "system_settings") return settingsQuery();
      const query = fake.from(table);
      query.insert = (rows) => {
        inserted.push(...rows);
        return Promise.resolve({ error: null });
      };
      return query;
    });
  });

  it("acota la reversion con el saldo leido de todas las paginas", async () => {
    const result = await reverse();

    expect(result).toEqual({ registered: true, points: 5 });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      customer_id: "c-1",
      points: -5,
      source: "partial_return",
      related_sale_id: SALE_ID,
    });
    expect(inserted[0].notes).toContain(
      "DESCUENTO LIMITADO POR SALDO DISPONIBLE DEL CLIENTE."
    );
  });

  it("propaga el error del saldo sin registrar la reversion", async () => {
    const pageError = { message: "boom" };
    const base = supabase.from.getMockImplementation();
    supabase.from.mockImplementation((table) => {
      const query = base(table);
      if (table !== "customer_points") return query;
      const applyIn = query.in;
      query.in = (column, values) => {
        applyIn(column, values);
        if (column === "customer_id") {
          query.limit = () => Promise.resolve({ data: null, error: pageError });
        }
        return query;
      };
      return query;
    });

    await expect(reverse()).rejects.toBe(pageError);
    expect(inserted).toHaveLength(0);
  });
});
