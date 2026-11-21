import { beforeEach, describe, expect, it, vi } from "vitest";

/*
  La exportacion no tiene tope: el doble corta cada respuesta en 2 filas y
  paginatedQuery usa paginas y lotes de 2, asi 5 ventas y 15 partidas obligan a
  leer varias paginas de la vista y de cada lote.
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
import {
  getAllSalesForExport,
  getDetailedSalesForExport,
} from "./salesReportService";

const filters = {
  startDateIso: "2026-11-01T00:00:00Z",
  endDateIso: "2026-11-30T23:59:59Z",
  branch: "Todas",
  cashier: "Todos",
  status: "Todos",
  payment: "Todos",
  discount: "Todos",
  timeZone: "America/Cancun",
};

const sales = Array.from({ length: 5 }, (_, index) => ({
  id: buildId("s", index),
  created_at: `2026-11-1${index}T12:00:00Z`,
  total: 100,
  discount_total: 0,
  branch_id: "b1",
  branch_name: "Centro",
  computed_status: "completed",
}));

const saleDetails = sales.flatMap((sale, saleIndex) =>
  [0, 1, 2].map((line) => ({
    id: buildId("d", saleIndex * 3 + line),
    sale_id: sale.id,
    quantity: 1,
    unit_price: 20,
    discount_amount: line === 0 ? 5 : 0,
    discount_type: "amount",
    total_price: line === 0 ? 15 : 20,
    products: { name: "Croqueta", barcode: "750" },
  }))
);

// Un canje por venta sobre la partida con descuento.
const rewards = sales.map((sale, saleIndex) => ({
  id: buildId("rw", saleIndex),
  sale_id: sale.id,
  sale_detail_id: buildId("d", saleIndex * 3),
}));

describe("salesReportService: exportacion completa", () => {
  beforeEach(() => {
    fake.current = createFakeSupabase({
      tables: {
        v_sales_report_list: sales,
        sale_details: saleDetails,
        sale_reward_redemptions: rewards,
      },
    });
  });

  it("getAllSalesForExport lee todas las ventas y las ordena por fecha descendente", async () => {
    const rows = await getAllSalesForExport(filters);

    expect(rows).toHaveLength(5);
    expect(rows.reduce((sum, row) => sum + row.total, 0)).toBe(500);
    expect(rows[0].ticketNumber).toBe(
      sales[4].id.substring(0, 8).toUpperCase()
    );
  });

  it("getDetailedSalesForExport lee todas las partidas y marca todos los canjes", async () => {
    const rows = await getDetailedSalesForExport(filters);

    expect(rows).toHaveLength(15);
    expect(rows.reduce((sum, row) => sum + row.totalPrice, 0)).toBe(275);
    expect(
      rows.filter((row) => row.discountType === "Canje Puntos")
    ).toHaveLength(5);
  });
});
