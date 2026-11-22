import { beforeEach, describe, expect, it, vi } from "vitest";

/*
  PostgREST corta cada respuesta en maxRows sin error. El doble corta en 2
  filas y paginatedQuery usa paginas y lotes de 2, asi pocas filas obligan a
  leer varias paginas por consulta y varias paginas por lote.
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
  getSaleDetails,
  getSalePayments,
  getSalesRows,
} from "./reportsSalesQueries";
import {
  getReturnItems,
  getSaleReturns,
  getTodayCancelledSales,
  getTodayReturns,
} from "./reportsReturnsService";

const DAY = "2026-11-10";

const sales = Array.from({ length: 5 }, (_, index) => ({
  id: buildId("s", index),
  sale_date: `${DAY}T1${4 - index}:00:00Z`,
  total: 100,
  status: "completed",
  branch_id: index === 4 ? "b2" : "b1",
}));

// Tres partidas por venta: un lote de 2 ventas trae 6 filas, 3 paginas.
const saleDetails = sales.flatMap((sale, saleIndex) =>
  [0, 1, 2].map((line) => ({
    id: buildId("d", saleIndex * 3 + line),
    sale_id: sale.id,
    product_id: "p1",
    quantity: 1,
    total_price: 10,
  }))
);

const salePayments = sales.flatMap((sale, saleIndex) =>
  [0, 1, 2].map((line) => ({
    id: buildId("pay", saleIndex * 3 + line),
    sale_id: sale.id,
    amount: 30,
  }))
);

const saleReturns = [0, 1, 2, 3, 4].map((index) => ({
  id: buildId("r", index),
  sale_id: sales[index % 2].id,
  total_refund: 10,
  created_at: `${DAY}T15:00:00Z`,
}));

const returnItems = saleReturns.flatMap((ret, returnIndex) =>
  [0, 1, 2].map((line) => ({
    id: buildId("ri", returnIndex * 3 + line),
    return_id: ret.id,
    quantity: 1,
  }))
);

// Cinco cancelaciones del dia sobre ventas distintas: tres paginas de 2.
const canceledSales = sales.map((sale, index) => ({
  id: buildId("c", index),
  sale_id: sale.id,
  created_at: `${DAY}T16:00:00Z`,
}));

const saleIds = sales.map((sale) => sale.id);

describe("reportes de inicio: lectura completa por paginas", () => {
  beforeEach(() => {
    fake.current = createFakeSupabase({
      tables: {
        sales,
        sale_details: saleDetails,
        sale_payments: salePayments,
        sale_returns: saleReturns,
        sale_return_items: returnItems,
        canceled_sales: canceledSales,
      },
    });
  });

  it("getSalesRows lee todas las ventas del rango y las ordena por fecha", async () => {
    const rows = await getSalesRows({
      branchId: "ALL",
      start: `${DAY}T00:00:00Z`,
      end: `${DAY}T23:59:59Z`,
    });

    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.sale_date)).toEqual(
      [...sales.map((sale) => sale.sale_date)].sort()
    );
  });

  it("getSalesRows respeta el filtro de sucursal en cada pagina", async () => {
    const rows = await getSalesRows({
      branchId: "b1",
      start: `${DAY}T00:00:00Z`,
      end: `${DAY}T23:59:59Z`,
    });

    expect(rows).toHaveLength(4);
  });

  it("getSaleDetails y getSalePayments paginan cada lote de ventas", async () => {
    const [details, payments] = await Promise.all([
      getSaleDetails(saleIds),
      getSalePayments(saleIds),
    ]);

    expect(details).toHaveLength(15);
    expect(payments.reduce((sum, row) => sum + row.amount, 0)).toBe(450);
  });

  it("getSaleReturns y getReturnItems leen todas las filas de cada lote", async () => {
    const returns = await getSaleReturns(saleIds);
    const items = await getReturnItems(returns.map((row) => row.id));

    expect(returns).toHaveLength(5);
    expect(items).toHaveLength(15);
  });

  it("getTodayReturns suma todas las devoluciones del dia", async () => {
    const result = await getTodayReturns({
      branchId: "ALL",
      todayStart: `${DAY}T00:00:00Z`,
      todayEnd: `${DAY}T23:59:59Z`,
    });

    expect(result.count).toBe(5);
    expect(result.amount).toBe(50);
    expect(result.units).toBe(15);
  });

  it("getTodayCancelledSales cuenta todas las cancelaciones del dia", async () => {
    const count = await getTodayCancelledSales({
      branchId: "ALL",
      todayStart: `${DAY}T00:00:00Z`,
      todayEnd: `${DAY}T23:59:59Z`,
    });

    expect(count).toBe(5);
  });

  it("getSalesRows ordena por instante y no por texto cuando falta la fraccion", async () => {
    fake.current = createFakeSupabase({
      tables: {
        sales: [
          { id: buildId("s", 0), sale_date: "2026-11-10T12:00:00.5+00:00" },
          { id: buildId("s", 1), sale_date: "2026-11-10T12:00:00+00:00" },
        ],
      },
    });

    const rows = await getSalesRows({
      branchId: "ALL",
      start: "2026-11-10T00:00:00+00:00",
      end: "2026-11-10T23:59:59+00:00",
    });

    expect(rows.map((row) => row.sale_date)).toEqual([
      "2026-11-10T12:00:00+00:00",
      "2026-11-10T12:00:00.5+00:00",
    ]);
  });
});
