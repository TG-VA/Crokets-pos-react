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
import { getCustomerCurrentPointsBalance } from "./salesCustomerPointsService";

describe("salesCustomerPointsService", () => {
  beforeEach(() => {
    const fake = createFakePostgrest({
      customer_points: [50, -20, 10, 5, 1].map((points, index) => ({
        id: buildId("m", index),
        customer_id: "c-1",
        points,
      })),
    });
    supabase.from.mockImplementation(fake.from);
  });

  it("getCustomerCurrentPointsBalance suma los movimientos de todas las paginas", async () => {
    expect(await getCustomerCurrentPointsBalance("c-1")).toBe(46);
  });
});
