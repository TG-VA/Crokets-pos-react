import { beforeEach, describe, expect, it, vi } from "vitest";

/*
  El doble corta cada respuesta de la RPC en 2 filas y paginatedQuery usa
  paginas de 2. Las tres partidas de cada venta comparten created_at: solo el
  desempate por detail_id hace que las paginas no repitan ni salten filas.
*/

const fake = vi.hoisted(() => ({ current: null }));

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: {
    from: (...args) => fake.current.from(...args),
    rpc: (...args) => fake.current.rpc(...args),
  },
}));

vi.mock(
  "../../../../../services/supabase/paginatedQuery",
  async (importOriginal) => {
    const { withSmallPages } =
      await import("../../../../../services/supabase/fakeSupabase.testUtils");
    return withSmallPages(await importOriginal());
  }
);

import {
  buildId,
  createFakeSupabase,
} from "../../../../../services/supabase/fakeSupabase.testUtils";
import { fetchCommissionsData } from "./commissionsReportService";

const rows = [0, 1, 2].flatMap((saleIndex) =>
  [0, 1, 2].map((line) => ({
    detail_id: buildId("d", saleIndex * 3 + line),
    sale_id: buildId("s", saleIndex),
    created_at: `2026-11-1${saleIndex}T12:00:00Z`,
    quantity: 1,
    total_price: 100,
    has_commission: true,
    commission_amount: 5,
  }))
);

describe("commissionsReportService: lectura completa de la RPC", () => {
  beforeEach(() => {
    fake.current = createFakeSupabase({
      rpcs: { get_commissions_report_data: rows },
    });
  });

  it("lee todas las partidas sin repetir y en orden de fecha descendente", async () => {
    const { detailedRows } = await fetchCommissionsData({
      startDateIso: "2026-11-01T00:00:00Z",
      endDateIso: "2026-11-30T23:59:59Z",
    });

    expect(detailedRows).toHaveLength(9);
    expect(new Set(detailedRows.map((row) => row.detailId)).size).toBe(9);
    expect(
      detailedRows.reduce((sum, row) => sum + row.commissionAmount, 0)
    ).toBe(45);
    expect(detailedRows[0].saleId).toBe(buildId("s", 2));
    expect(detailedRows[8].saleId).toBe(buildId("s", 0));
  });
});
