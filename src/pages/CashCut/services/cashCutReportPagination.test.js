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
import {
  calculateCancellations,
  calculateDollarTotals,
  calculatePartialReturns,
  calculateRewardSummary,
  calculateSalesTotals,
  fetchCancellationsByShift,
  fetchDepartmentSales,
  fetchPartialReturnsByShift,
  fetchPaymentsByMethod,
  fetchRewardRedemptions,
  fetchSalesByShift,
  fetchUsdPayments,
  groupPaymentsByMethod,
  groupSalesByDepartment,
} from "./cashCutReportService";

/*
  El doble corta cada respuesta en 2 filas y paginatedQuery usa paginas y lotes
  de 2: un turno de 7 ventas ocupa varias paginas y varios lotes de .in(). Los
  totales deben coincidir con los calculados sobre el turno completo, que es lo
  que daria una sola pagina.
*/

const SHIFT = {
  branchId: "b-1",
  userId: "u-1",
  startAt: "2026-11-21T09:00:00Z",
};

const CASH = { id: "pm-cash", name: "Efectivo", affects_cash: true };
const CARD = { id: "pm-card", name: "Tarjeta", affects_cash: false };

const buildTime = (index) =>
  `2026-11-21T${String(10 + index).padStart(2, "0")}:00:00Z`;

const sales = Array.from({ length: 7 }, (_, index) => ({
  id: buildId("s", index),
  branch_id: "b-1",
  user_id: "u-1",
  status: index === 6 ? "cancelled" : "completed",
  subtotal: 100 + index,
  tax: 16,
  total: 116 + index,
  created_at: buildTime(index),
}));

const otherShiftSale = {
  id: buildId("s", 99),
  branch_id: "b-1",
  user_id: "u-2",
  status: "completed",
  subtotal: 500,
  tax: 80,
  total: 580,
  created_at: buildTime(1),
};

const salePayments = sales.flatMap((sale, index) => [
  {
    id: buildId("sp", index * 2),
    sale_id: sale.id,
    branch_id: "b-1",
    amount: 50 + index,
    currency: "MXN",
    exchange_rate: 1,
    payment_method_id: CASH.id,
    payment_methods: CASH,
  },
  {
    id: buildId("sp", index * 2 + 1),
    sale_id: sale.id,
    branch_id: "b-1",
    amount: 3 + index,
    currency: index % 2 === 0 ? "USD" : "MXN",
    exchange_rate: 18,
    payment_method_id: CARD.id,
    payment_methods: CARD,
  },
]);

const saleDetails = sales.flatMap((sale, index) =>
  [0, 1, 2].map((line) => ({
    id: buildId("sd", index * 3 + line),
    sale_id: sale.id,
    total_price: 10 * (line + 1) + index,
    products: {
      department_id: `d-${line}`,
      departments: { name: ["Alimento", "Juguetes", "Higiene"][line] },
    },
  }))
);

const canceledSales = [0, 1, 2].map((index) => ({
  id: buildId("cs", index),
  sale_id: sales[index].id,
  branch_id: "b-1",
  user_id: "u-1",
  refund_amount: 20 + index,
  canceled_at: buildTime(index),
  payment_methods: index === 1 ? CARD : CASH,
}));

const saleReturns = [0, 1, 2].map((index) => ({
  id: buildId("sr", index),
  sale_id: sales[index + 3].id,
  branch_id: "b-1",
  user_id: "u-1",
  total_refund: 5 + index,
  created_at: buildTime(index),
  payment_methods: CASH,
}));

const redemptions = sales.slice(0, 5).map((sale, index) => ({
  id: buildId("rr", index),
  sale_id: sale.id,
  quantity: 1,
  total_points: 10 * (index + 1),
  reversed_at: index === 4 ? buildTime(index) : null,
}));

describe("cashCutReportService con turnos de varias paginas", () => {
  let fake;

  beforeEach(() => {
    fake = createFakePostgrest({
      sales: [...sales, otherShiftSale],
      sale_payments: salePayments,
      sale_details: saleDetails,
      canceled_sales: canceledSales,
      sale_returns: saleReturns,
      sale_reward_redemptions: redemptions,
    });
    supabase.from.mockImplementation(fake.from);
  });

  it("lee todas las ventas del turno y da los mismos totales", async () => {
    const { data, error } = await fetchSalesByShift(SHIFT);

    expect(error).toBeNull();
    expect(data).toHaveLength(7);
    expect(calculateSalesTotals(data)).toEqual(calculateSalesTotals(sales));
    expect(
      fake.calls.filter((call) => call.table === "sales").length
    ).toBeGreaterThan(1);
  });

  it("da los mismos pagos por metodo y en dolares", async () => {
    const saleIds = sales.map((sale) => sale.id);

    const payments = await fetchPaymentsByMethod({ saleIds, branchId: "b-1" });
    const usd = await fetchUsdPayments({ saleIds, branchId: "b-1" });

    expect(payments.data).toHaveLength(14);
    expect(groupPaymentsByMethod(payments.data)).toEqual(
      groupPaymentsByMethod(salePayments)
    );
    expect(calculateDollarTotals(usd.data)).toEqual(
      calculateDollarTotals(
        salePayments.filter((payment) => payment.currency === "USD")
      )
    );
  });

  it("da las mismas ventas por departamento", async () => {
    const { data } = await fetchDepartmentSales({
      saleIds: sales.map((sale) => sale.id),
    });

    expect(data).toHaveLength(21);
    expect(groupSalesByDepartment(data)).toEqual(
      groupSalesByDepartment(saleDetails)
    );
    // Cada lote de 2 ventas trae 6 renglones: 3 paginas llenas y una vacia
    // que confirma el final.
    const firstBatchCalls = fake.calls.filter(
      (call) =>
        call.table === "sale_details" &&
        call.filters.some(
          ({ column, value }) =>
            column === "sale_id" && value.includes(sales[0].id)
        )
    );
    expect(firstBatchCalls).toHaveLength(4);
  });

  it("da los mismos canjes de recompensas", async () => {
    const { data } = await fetchRewardRedemptions({
      saleIds: sales.map((sale) => sale.id),
    });

    expect(calculateRewardSummary(data)).toEqual(
      calculateRewardSummary(redemptions)
    );
  });

  it("lee cancelaciones y devoluciones completas, de la mas reciente a la mas antigua", async () => {
    const cancellations = await fetchCancellationsByShift(SHIFT);
    const returns = await fetchPartialReturnsByShift(SHIFT);

    expect(cancellations.data.map((row) => row.id)).toEqual([
      buildId("cs", 2),
      buildId("cs", 1),
      buildId("cs", 0),
    ]);
    expect(calculateCancellations(cancellations.data)).toEqual(
      calculateCancellations([...canceledSales].reverse())
    );
    expect(calculatePartialReturns(returns.data)).toEqual(
      calculatePartialReturns([...saleReturns].reverse())
    );
  });

  it("propaga el error de una pagina sin filas parciales", async () => {
    supabase.from.mockImplementation(() => {
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        gte: () => query,
        order: () => query,
        limit: () =>
          Promise.resolve({ data: null, error: { message: "boom" } }),
      };
      return query;
    });

    const result = await fetchCancellationsByShift(SHIFT);

    expect(result).toEqual({ data: null, error: { message: "boom" } });
  });
});
