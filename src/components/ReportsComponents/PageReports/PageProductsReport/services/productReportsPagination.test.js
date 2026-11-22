import { describe, expect, it, vi } from "vitest";

/*
  El doble corta cada respuesta en 2 filas (como PostgREST en 1000) y
  paginatedQuery usa paginas de 2: 5 partidas y 4 registros de inventario
  obligan a leer varias paginas. El filtro del embed sales!inner se aplica en
  cada pagina.
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
import { fetchProductsReportData } from "./productReportsService";

const completedSale = {
  status: "completed",
  branch_id: "b1",
  created_at: "2026-11-10T12:00:00Z",
};

// Cinco partidas vendidas de p-a y una de una venta cancelada.
const saleDetails = [0, 1, 2, 3, 4, 5].map((index) => ({
  id: buildId("d", index),
  product_id: "p-a",
  quantity: 2,
  total_price: 40,
  products: { name: "A", department: { name: "Alimentos" } },
  sales:
    index === 5 ? { ...completedSale, status: "cancelled" } : completedSale,
}));

// p-a tiene stock en dos sucursales; p-b y p-c no se vendieron.
const branchInventory = [
  { product_id: "p-a", branch_id: "b1", stock: 4 },
  { product_id: "p-a", branch_id: "b2", stock: 6 },
  { product_id: "p-b", branch_id: "b1", stock: 3 },
  { product_id: "p-c", branch_id: "b2", stock: 7 },
].map((row, index) => ({
  ...row,
  id: buildId("bi", index),
  is_active: true,
  products: { id: row.product_id, name: row.product_id },
}));

describe("productReportsService: lectura completa por paginas", () => {
  it("suma todas las partidas y todo el inventario de todas las sucursales", async () => {
    fake.current = createFakeSupabase({
      tables: { sale_details: saleDetails, branch_inventory: branchInventory },
    });

    const result = await fetchProductsReportData({
      startDate: "2026-11-01T00:00:00Z",
      endDate: "2026-11-30T23:59:59Z",
      branchId: "ALL",
    });

    expect(result.kpis.totalUnits).toBe(10);
    expect(result.kpis.totalRevenue).toBe(200);
    expect(result.topProducts[0].stock).toBe(10);
    expect(result.deadStock.map((row) => row.id)).toEqual(["p-c", "p-b"]);
  });
});
