import { beforeEach, describe, expect, it, vi } from "vitest";

/*
  El doble corta cada respuesta en 2 filas (como PostgREST en 1000) y
  paginatedQuery usa paginas y lotes de 2: 3 sesiones, 5 movimientos y 5
  pagos obligan a leer varias paginas por consulta y por lote.
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
  fetchCashMovements,
  fetchCashSessions,
  fetchPaymentMethodsSummary,
} from "./cashReportService";
import { fetchCashSessionDetail } from "./cashReportDetailService";

const OPENED_AT = "2026-11-10T08:00:00Z";
const CLOSED_AT = "2026-11-10T20:00:00Z";

// Las tres sesiones abren a la misma hora: solo session_id desempata.
const sessions = [0, 1, 2].map((index) => ({
  session_id: buildId("cs", index),
  user_id: "u1",
  branch_id: "b1",
  opening_amount: 100,
  opened_at: OPENED_AT,
  cash_sales: 50,
}));

// Cinco movimientos en la sesion 0: tres entradas de $10 y dos retiros de $5.
const movements = [0, 1, 2, 3, 4].map((index) => ({
  id: buildId("m", index),
  session_id: sessions[0].session_id,
  user_id: "u1",
  branch_id: "b1",
  movement_type: index < 3 ? "entrada" : "retiro",
  amount: index < 3 ? 10 : 5,
  created_at: `2026-11-10T1${4 - index}:00:00Z`,
}));

const sales = [0, 1, 2].map((index) => ({
  id: buildId("s", index),
  user_id: "u1",
  branch_id: "b1",
  status: "completed",
  created_at: "2026-11-10T12:00:00Z",
  discount_total: 5,
}));

const payments = [0, 1, 2, 3, 4].map((index) => ({
  id: buildId("pay", index),
  sale_id: sales[index % 3].id,
  payment_method_id: "cash",
  branch_id: "b1",
  amount: 20,
  created_at: "2026-11-10T12:00:00Z",
  payment_methods: { id: "cash", name: "Efectivo", affects_cash: true },
  sales: sales[index % 3],
}));

const saleDetails = [0, 1, 2, 3, 4].map((index) => ({
  id: buildId("d", index),
  sale_id: sales[index % 3].id,
  quantity: 1,
  discount_amount: index === 4 ? 0 : 2,
  discount_type: "manual",
}));

const rewards = [0, 1, 2].map((index) => ({
  id: buildId("rw", index),
  sale_id: sales[index].id,
  total_points: 10,
  created_at: "2026-11-10T12:00:00Z",
}));

describe("reporte de caja: lectura completa por paginas", () => {
  beforeEach(() => {
    fake.current = createFakeSupabase({
      tables: {
        cash_register_sessions: [
          {
            id: sessions[0].session_id,
            user_id: "u1",
            branch_id: "b1",
            opening_amount: 100,
            opened_at: OPENED_AT,
            closed_at: CLOSED_AT,
          },
        ],
        cash_movements: movements,
        sales,
        sale_payments: payments,
        sale_details: saleDetails,
        sale_reward_redemptions: rewards,
      },
      rpcs: { get_cash_report_sessions: sessions },
    });
  });

  it("fetchCashSessions lee todas las sesiones y todos sus movimientos", async () => {
    const result = await fetchCashSessions({});

    expect(result.map((session) => session.id)).toEqual(
      sessions.map((session) => session.session_id)
    );
    expect(result[0].manualIn).toBe(30);
    expect(result[0].manualOut).toBe(10);
    expect(result[0].expectedCash).toBe(170);
  });

  it("fetchCashMovements lee todas las filas y las ordena por fecha descendente", async () => {
    const result = await fetchCashMovements({});

    expect(result).toHaveLength(5);
    expect(result.map((row) => row.id)).toEqual(movements.map((row) => row.id));
  });

  it("fetchPaymentMethodsSummary suma todos los pagos", async () => {
    const [cash] = await fetchPaymentMethodsSummary({});

    expect(cash.count).toBe(5);
    expect(cash.amount).toBe(100);
  });

  it("fetchCashSessionDetail lee movimientos, ventas, pagos, descuentos y canjes completos", async () => {
    const detail = await fetchCashSessionDetail(sessions[0].session_id);

    expect(detail.movements).toHaveLength(5);
    expect(detail.movements[0].id).toBe(buildId("m", 4));
    expect(detail.totalManualIn).toBe(30);
    expect(detail.salesCount).toBe(3);
    expect(detail.cashSalesTotal).toBe(100);
    expect(detail.totalDiscounts).toBe(15);
    expect(detail.totalRedemptions).toBe(3);
    expect(
      detail.discountsAndRewardsList.filter((item) => !item.isReward)
    ).toHaveLength(4);
  });
});
