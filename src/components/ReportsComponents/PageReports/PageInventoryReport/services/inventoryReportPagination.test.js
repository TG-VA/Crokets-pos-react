import { describe, expect, it, vi } from "vitest";

/*
  El doble corta cada respuesta de la RPC en 2 filas y paginatedQuery usa
  paginas de 2. Dos productos con el mismo nombre solo quedan en un orden
  estable gracias al desempate por product_id.
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
import { fetchInventoryReportData } from "./inventoryReportService";

const rows = ["B", "A", "A", "C", "B"].map((name, index) => ({
  product_id: buildId("p", index),
  product_name: name,
  tracks_inventory: true,
  is_kit: false,
  stock: 10,
  cost_price: 5,
  total_cost: 50,
  total_sale: 80,
  status: "optimal",
}));

describe("inventoryReportService: lectura completa de la RPC", () => {
  it("lee todos los productos en orden de nombre y valoriza el total", async () => {
    fake.current = createFakeSupabase({
      rpcs: { get_inventory_report_data: rows },
    });

    const result = await fetchInventoryReportData("ALL");

    expect(result.items.map((item) => item.id)).toEqual([
      buildId("p", 1),
      buildId("p", 2),
      buildId("p", 0),
      buildId("p", 4),
      buildId("p", 3),
    ]);
    expect(result.kpis.totalUnits).toBe(50);
    expect(result.kpis.totalCostValuation).toBe(250);
  });
});
