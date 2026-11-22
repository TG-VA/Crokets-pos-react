import { beforeEach, describe, expect, it, vi } from "vitest";

/*
  El doble corta cada respuesta en 2 filas (como PostgREST en 1000) y
  paginatedQuery usa paginas y lotes de 2: clientes, ventas, puntos, canjes y
  partidas obligan a leer varias paginas por consulta y por lote.
*/

const fake = vi.hoisted(() => ({ current: null }));

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: {
    from: (...args) => fake.current.from(...args),
    rpc: (...args) => fake.current.rpc(...args),
  },
}));

vi.mock("../../../../../services/branchScopeService", () => ({
  fetchAllBranches: async () => ({ data: [], error: null }),
  fetchOperationalBranches: async () => ({ data: [], error: null }),
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
import { fetchCustomersReportData } from "./customersReportService";
import { fetchCustomerDetailReport } from "./customerDetailService";

const customers = ["c1", "c2", "c3"].map((id) => ({
  id,
  name: id,
  is_points_customer: true,
  status: true,
}));

// c1 compra tres veces, c2 dos; una venta de mostrador no tiene cliente.
const sales = ["c1", "c2", "c1", "c2", "c1", null].map((customerId, index) => ({
  id: buildId("s", index),
  customer_id: customerId,
  branch_id: "b1",
  total: 100,
  discount_total: 0,
  status: "completed",
  sale_date: `2026-11-1${index}T12:00:00Z`,
}));

const saleDetails = sales.flatMap((sale, saleIndex) =>
  [0, 1, 2].map((line) => ({
    id: buildId("d", saleIndex * 3 + line),
    sale_id: sale.id,
    product_id: "p-a",
    quantity: 1,
    total_price: 30,
    products: { id: "p-a", name: "A" },
    sales: { customer_id: sale.customer_id, sale_date: sale.sale_date },
  }))
);

const points = [0, 1, 2, 3, 4].map((index) => ({
  id: buildId("pt", index),
  customer_id: "c1",
  branch_id: "b1",
  points: 10,
  movement_type: "earn",
  created_at: `2026-11-1${index}T12:00:00Z`,
}));

const redemptions = [0, 1, 2].map((index) => ({
  id: buildId("rw", index),
  customer_id: "c1",
  branch_id: "b1",
  quantity: 1,
  total_points: 5,
  discount_amount: 10,
}));

describe("reporte de clientes: lectura completa por paginas", () => {
  beforeEach(() => {
    fake.current = createFakeSupabase({
      tables: {
        customers,
        sales,
        sale_details: saleDetails,
        customer_points: points,
        sale_reward_redemptions: redemptions,
      },
    });
  });

  it("fetchCustomersReportData lee clientes, ventas, puntos, canjes y partidas completos", async () => {
    const result = await fetchCustomersReportData({ branchId: "ALL" });
    const c1 = result.rankedCustomers.find((row) => row.id === "c1");
    const c2 = result.rankedCustomers.find((row) => row.id === "c2");

    expect(result.salesCount).toBe(5);
    expect(result.rankedCustomers).toHaveLength(2);
    expect(c1.totalSpent).toBe(300);
    expect(c2.purchasesCount).toBe(2);
    expect(c1.pointsBalance).toBe(50);
    expect(c1.rewardsRedeemedCount).toBe(3);
    expect(result.pointsList).toHaveLength(5);
    expect(result.topProducts[0].quantity).toBe(15);
  });

  it("fetchCustomerDetailReport lee todas las ventas, partidas y puntos del cliente", async () => {
    const detail = await fetchCustomerDetailReport("c1");

    expect(detail.sales.map((sale) => sale.id)).toEqual([
      buildId("s", 4),
      buildId("s", 2),
      buildId("s", 0),
    ]);
    expect(detail.sales.every((sale) => sale.items.length === 3)).toBe(true);
    expect(detail.pointsLedger).toHaveLength(5);
    expect(detail.pointsLedger[0].id).toBe(buildId("pt", 4));
  });
});
