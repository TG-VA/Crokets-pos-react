import { beforeEach, describe, expect, it, vi } from "vitest";

/*
  Traza de margen con tope de filas. El doble corta cada respuesta en 2 filas
  (como PostgREST en 1000) y paginatedQuery usa paginas de 2.

  Datos: 3 ventas vigentes y 1 cancelada; cada venta tiene 3 partidas:
    A: 1 x $100, costo congelado $60  -> utilidad $40
    B: 2 x $25,  costo congelado $15  -> utilidad $20
    C: 1 x $30,  costo congelado $30  -> utilidad $0
  Por venta: ingreso $180, costo $120. Tres ventas: $540 / $360 / $180, 33.33%.
  Leyendo solo la primera respuesta (2 ventas, 2 partidas) el reporte daba
  ingreso $150, costo $90 y margen 40%.
*/

const fake = vi.hoisted(() => ({ current: null }));

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: {
    from: (...args) => fake.current.from(...args),
    rpc: (...args) => fake.current.rpc(...args),
  },
}));

vi.mock("../../../../../services/branchScopeService", () => ({
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
import { fetchProfitabilityReportData } from "./profitabilityReportService";

const products = [
  { id: "p-a", name: "A", department_id: "d1", cost_price: 60, is_kit: false },
  { id: "p-b", name: "B", department_id: "d1", cost_price: 15, is_kit: false },
  { id: "p-c", name: "C", department_id: "d1", cost_price: 30, is_kit: false },
];

const lines = [
  { product_id: "p-a", quantity: 1, unit_price: 100, total: 100, cost: 60 },
  { product_id: "p-b", quantity: 2, unit_price: 25, total: 50, cost: 15 },
  { product_id: "p-c", quantity: 1, unit_price: 30, total: 30, cost: 30 },
];

const sales = [0, 1, 2, 3].map((index) => ({
  id: buildId("s", index),
  sale_date: "2026-11-10T12:00:00.000Z",
  total: 180,
  discount_total: 0,
  status: index === 3 ? "cancelled" : "completed",
  branch_id: "b1",
}));

const saleDetails = sales.flatMap((sale, saleIndex) =>
  lines.map((line, lineIndex) => ({
    id: buildId("d", saleIndex * 3 + lineIndex),
    sale_id: sale.id,
    product_id: line.product_id,
    quantity: line.quantity,
    unit_price: line.unit_price,
    discount_amount: 0,
    total_price: line.total,
    cost_price: line.cost,
    products: products.find((product) => product.id === line.product_id),
  }))
);

const branchInventory = products.map((product, index) => ({
  id: buildId("bi", index),
  branch_id: "b1",
  product_id: product.id,
  cost_price: product.cost_price,
  sale_price: 0,
  stock: 10,
}));

describe("profitabilityReportService: margen con lectura paginada", () => {
  beforeEach(() => {
    fake.current = createFakeSupabase({
      tables: {
        departments: [{ id: "d1", name: "Alimentos" }],
        products,
        product_kits: [],
        branch_inventory: branchInventory,
        sales,
        sale_details: saleDetails,
      },
    });
  });

  it("suma todas las ventas y partidas del periodo", async () => {
    const result = await fetchProfitabilityReportData({ branchId: "ALL" });

    expect(result.totalSalesCount).toBe(3);
    expect(result.kpis.totalRevenue).toBe(540);
    expect(result.kpis.totalCost).toBe(360);
    expect(result.kpis.grossProfit).toBe(180);
    expect(result.kpis.grossMarginPercent).toBeCloseTo(33.33, 2);
  });

  it("lee el catalogo y el inventario completos para los tres productos", async () => {
    const result = await fetchProfitabilityReportData({ branchId: "b1" });

    expect(result.productsProfitability).toHaveLength(3);
    const productB = result.productsProfitability.find(
      (product) => product.productId === "p-b"
    );
    expect(productB.totalUnits).toBe(6);
    expect(productB.grossProfit).toBe(60);
  });
});
