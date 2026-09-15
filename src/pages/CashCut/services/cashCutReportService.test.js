import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from "../../../lib/supabaseClient";
import {
  fetchActiveSession,
  fetchBranchName,
  fetchCutsHistory,
  fetchExistingShiftCut,
  fetchSalesByShift,
  fetchCancellationsByShift,
  fetchPartialReturnsByShift,
  fetchRewardRedemptions,
  fetchPaymentsByMethod,
  fetchUsdPayments,
  fetchDepartmentSales,
  fetchCashMovementsBySession,
  createCashCut,
  insertCashCutDetails,
  closeCashRegisterSession,
  calculateSalesTotals,
  fetchHistoricalCutDetail,
} from "./cashCutReportService";

const thenableQuery = (resolve = { data: null, error: null }) => {
  const q = {
    select: vi.fn(),
    insert: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };

  Object.values(q).forEach((fn) => fn.mockReturnValue(q));

  q.maybeSingle = vi.fn(() => Promise.resolve(resolve));
  q.single = vi.fn(() => Promise.resolve(resolve));
  q.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolve).then(onFulfilled, onRejected);

  return q;
};

describe("cashCutReportService", () => {
  beforeEach(() => {
    supabase.from.mockReset();
    supabase.rpc.mockReset();
  });

  describe("punto de acceso unificado", () => {
    it("re-exporta los calculos y el detalle del corte", () => {
      expect(typeof calculateSalesTotals).toBe("function");
      expect(typeof fetchHistoricalCutDetail).toBe("function");
    });
  });

  describe("fetchActiveSession", () => {
    it("busca la sesion abierta mas reciente del usuario", async () => {
      const q = thenableQuery({ data: { id: "s1" }, error: null });
      supabase.from.mockReturnValue(q);

      const result = await fetchActiveSession({ userId: "u1" });

      expect(supabase.from).toHaveBeenCalledWith("cash_register_sessions");
      expect(q.select).toHaveBeenCalledWith("*");
      expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
      expect(q.eq).toHaveBeenCalledWith("status", "open");
      expect(q.order).toHaveBeenCalledWith("opened_at", { ascending: false });
      expect(q.limit).toHaveBeenCalledWith(1);
      expect(q.maybeSingle).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: { id: "s1" }, error: null });
    });

    it("propaga el error de la consulta", async () => {
      const q = thenableQuery({ data: null, error: { message: "boom" } });
      supabase.from.mockReturnValue(q);

      const result = await fetchActiveSession({ userId: "u1" });

      expect(result.error).toEqual({ message: "boom" });
    });
  });

  describe("fetchBranchName", () => {
    it("consulta el nombre de la sucursal por id", async () => {
      const q = thenableQuery({ data: { name: "Norte" }, error: null });
      supabase.from.mockReturnValue(q);

      const result = await fetchBranchName({ branchId: "b1" });

      expect(supabase.from).toHaveBeenCalledWith("branches");
      expect(q.select).toHaveBeenCalledWith("name");
      expect(q.eq).toHaveBeenCalledWith("id", "b1");
      expect(q.maybeSingle).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: { name: "Norte" }, error: null });
    });

    it("propaga el error de la consulta", async () => {
      const q = thenableQuery({ data: null, error: { message: "boom" } });
      supabase.from.mockReturnValue(q);

      const result = await fetchBranchName({ branchId: "b1" });

      expect(result.error).toEqual({ message: "boom" });
    });
  });

  describe("fetchCutsHistory", () => {
    it("consulta el historial de cortes de la sucursal con embeds", async () => {
      const q = thenableQuery({ data: [], error: null });
      supabase.from.mockReturnValue(q);

      await fetchCutsHistory({ branchId: "b1" });

      expect(supabase.from).toHaveBeenCalledWith("cash_cuts");
      expect(q.select).toHaveBeenCalledWith(
        expect.stringContaining("cash_register_sessions")
      );
      expect(q.select).toHaveBeenCalledWith(
        expect.stringContaining("users")
      );
      expect(q.eq).toHaveBeenCalledWith("branch_id", "b1");
      expect(q.eq).toHaveBeenCalledWith("cut_type", "shift");
      expect(q.order).toHaveBeenCalledWith("created_at", { ascending: false });
      expect(q.limit).toHaveBeenCalledWith(300);
    });

    it("no consulta y devuelve vacio si no hay sucursal", async () => {
      const result = await fetchCutsHistory({ branchId: null });

      expect(result).toEqual({ data: [], error: null });
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe("fetchExistingShiftCut", () => {
    it("busca el corte de turno mas reciente de la sesion", async () => {
      const q = thenableQuery({ data: null, error: null });
      supabase.from.mockReturnValue(q);

      await fetchExistingShiftCut({ sessionId: "s1" });

      expect(supabase.from).toHaveBeenCalledWith("cash_cuts");
      expect(q.select).toHaveBeenCalledWith("*");
      expect(q.eq).toHaveBeenCalledWith("cash_register_session_id", "s1");
      expect(q.eq).toHaveBeenCalledWith("cut_type", "shift");
      expect(q.order).toHaveBeenCalledWith("created_at", { ascending: false });
      expect(q.limit).toHaveBeenCalledWith(1);
      expect(q.maybeSingle).toHaveBeenCalledTimes(1);
    });

    it("propaga el error de la consulta", async () => {
      const q = thenableQuery({ data: null, error: { message: "boom" } });
      supabase.from.mockReturnValue(q);

      const result = await fetchExistingShiftCut({ sessionId: "s1" });

      expect(result.error).toEqual({ message: "boom" });
    });
  });

  describe("fetchSalesByShift", () => {
    it("consulta ventas del turno sin tope superior cuando endAt es null", async () => {
      const q = thenableQuery({ data: [], error: null });
      supabase.from.mockReturnValue(q);

      await fetchSalesByShift({
        branchId: "b1",
        userId: "u1",
        startAt: "2026-09-01T09:00:00.000Z",
        endAt: null,
      });

      expect(supabase.from).toHaveBeenCalledWith("sales");
      expect(q.select).toHaveBeenCalledWith(
        "id, subtotal, tax, total, created_at, status"
      );
      expect(q.eq).toHaveBeenCalledWith("branch_id", "b1");
      expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
      expect(q.in).toHaveBeenCalledWith("status", [
        "completed",
        "cancelled",
        "refunded",
      ]);
      expect(q.gte).toHaveBeenCalledWith(
        "created_at",
        "2026-09-01T09:00:00.000Z"
      );
      expect(q.lte).not.toHaveBeenCalled();
    });

    it("aplica el tope superior cuando hay endAt", async () => {
      const q = thenableQuery({ data: [], error: null });
      supabase.from.mockReturnValue(q);

      await fetchSalesByShift({
        branchId: "b1",
        userId: "u1",
        startAt: "2026-09-01T09:00:00.000Z",
        endAt: "2026-09-01T19:00:00.000Z",
      });

      expect(q.lte).toHaveBeenCalledWith(
        "created_at",
        "2026-09-01T19:00:00.000Z"
      );
    });
  });

  describe("fetchCancellationsByShift", () => {
    it("consulta cancelaciones con embed de metodos de pago", async () => {
      const q = thenableQuery({ data: [], error: null });
      supabase.from.mockReturnValue(q);

      await fetchCancellationsByShift({
        branchId: "b1",
        userId: "u1",
        startAt: "2026-09-01T09:00:00.000Z",
        endAt: null,
      });

      expect(supabase.from).toHaveBeenCalledWith("canceled_sales");
      expect(q.select).toHaveBeenCalledWith(
        expect.stringContaining("payment_methods")
      );
      expect(q.eq).toHaveBeenCalledWith("branch_id", "b1");
      expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
      expect(q.gte).toHaveBeenCalledWith(
        "canceled_at",
        "2026-09-01T09:00:00.000Z"
      );
      expect(q.order).toHaveBeenCalledWith("canceled_at", {
        ascending: false,
      });
      expect(q.lte).not.toHaveBeenCalled();
    });

    it("aplica el tope superior sobre canceled_at cuando hay endAt", async () => {
      const q = thenableQuery({ data: [], error: null });
      supabase.from.mockReturnValue(q);

      await fetchCancellationsByShift({
        branchId: "b1",
        userId: "u1",
        startAt: "2026-09-01T09:00:00.000Z",
        endAt: "2026-09-01T19:00:00.000Z",
      });

      expect(q.lte).toHaveBeenCalledWith(
        "canceled_at",
        "2026-09-01T19:00:00.000Z"
      );
    });
  });

  describe("fetchPartialReturnsByShift", () => {
    it("consulta devoluciones parciales con embed de metodos de pago", async () => {
      const q = thenableQuery({ data: [], error: null });
      supabase.from.mockReturnValue(q);

      await fetchPartialReturnsByShift({
        branchId: "b1",
        userId: "u1",
        startAt: "2026-09-01T09:00:00.000Z",
        endAt: null,
      });

      expect(supabase.from).toHaveBeenCalledWith("sale_returns");
      expect(q.select).toHaveBeenCalledWith(
        expect.stringContaining("payment_methods")
      );
      expect(q.eq).toHaveBeenCalledWith("branch_id", "b1");
      expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
      expect(q.gte).toHaveBeenCalledWith(
        "created_at",
        "2026-09-01T09:00:00.000Z"
      );
      expect(q.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
      expect(q.lte).not.toHaveBeenCalled();
    });

    it("aplica el tope superior sobre created_at cuando hay endAt", async () => {
      const q = thenableQuery({ data: [], error: null });
      supabase.from.mockReturnValue(q);

      await fetchPartialReturnsByShift({
        branchId: "b1",
        userId: "u1",
        startAt: "2026-09-01T09:00:00.000Z",
        endAt: "2026-09-01T19:00:00.000Z",
      });

      expect(q.lte).toHaveBeenCalledWith(
        "created_at",
        "2026-09-01T19:00:00.000Z"
      );
    });
  });

  describe("fetchRewardRedemptions", () => {
    it("deduplica y limpia los ids de venta antes de consultar", async () => {
      const q = thenableQuery({ data: [], error: null });
      supabase.from.mockReturnValue(q);

      await fetchRewardRedemptions({ saleIds: ["s1", "s1", null, "s2", ""] });

      expect(supabase.from).toHaveBeenCalledWith("sale_reward_redemptions");
      expect(q.select).toHaveBeenCalledWith(
        "id, sale_id, quantity, total_points, reversed_at"
      );
      expect(q.in).toHaveBeenCalledWith("sale_id", ["s1", "s2"]);
    });

    it("no consulta y devuelve vacio si no hay ids validos", async () => {
      const result = await fetchRewardRedemptions({ saleIds: [] });

      expect(result).toEqual({ data: [], error: null });
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe("fetchPaymentsByMethod", () => {
    it("consulta pagos con embed de metodos por venta y sucursal", async () => {
      const q = thenableQuery({ data: [], error: null });
      supabase.from.mockReturnValue(q);

      await fetchPaymentsByMethod({ saleIds: ["s1"], branchId: "b1" });

      expect(supabase.from).toHaveBeenCalledWith("sale_payments");
      expect(q.select).toHaveBeenCalledWith(
        "amount, payment_method_id, payment_methods(id, name, affects_cash)"
      );
      expect(q.in).toHaveBeenCalledWith("sale_id", ["s1"]);
      expect(q.eq).toHaveBeenCalledWith("branch_id", "b1");
    });
  });

  describe("fetchUsdPayments", () => {
    it("consulta pagos filtrando por moneda USD", async () => {
      const q = thenableQuery({ data: [], error: null });
      supabase.from.mockReturnValue(q);

      await fetchUsdPayments({ saleIds: ["s1"], branchId: "b1" });

      expect(supabase.from).toHaveBeenCalledWith("sale_payments");
      expect(q.select).toHaveBeenCalledWith("amount, currency, exchange_rate");
      expect(q.in).toHaveBeenCalledWith("sale_id", ["s1"]);
      expect(q.eq).toHaveBeenCalledWith("branch_id", "b1");
      expect(q.eq).toHaveBeenCalledWith("currency", "USD");
    });
  });

  describe("fetchDepartmentSales", () => {
    it("consulta el detalle de venta con embed de productos y departamentos", async () => {
      const q = thenableQuery({ data: [], error: null });
      supabase.from.mockReturnValue(q);

      await fetchDepartmentSales({ saleIds: ["s1"] });

      expect(supabase.from).toHaveBeenCalledWith("sale_details");
      expect(q.select).toHaveBeenCalledWith(
        "total_price, products(department_id, departments(name))"
      );
      expect(q.in).toHaveBeenCalledWith("sale_id", ["s1"]);
    });
  });

  describe("fetchCashMovementsBySession", () => {
    it("consulta movimientos de la sesion sin tope cuando endAt es null", async () => {
      const q = thenableQuery({ data: [], error: null });
      supabase.from.mockReturnValue(q);

      await fetchCashMovementsBySession({ sessionId: "s1", endAt: null });

      expect(supabase.from).toHaveBeenCalledWith("cash_movements");
      expect(q.select).toHaveBeenCalledWith(
        "id, movement_type, amount, description, created_at"
      );
      expect(q.eq).toHaveBeenCalledWith("session_id", "s1");
      expect(q.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
      expect(q.lte).not.toHaveBeenCalled();
    });

    it("aplica el tope superior cuando hay endAt", async () => {
      const q = thenableQuery({ data: [], error: null });
      supabase.from.mockReturnValue(q);

      await fetchCashMovementsBySession({
        sessionId: "s1",
        endAt: "2026-09-01T19:00:00.000Z",
      });

      expect(q.lte).toHaveBeenCalledWith(
        "created_at",
        "2026-09-01T19:00:00.000Z"
      );
    });

    it("no consulta y devuelve vacio si no hay sesion", async () => {
      const result = await fetchCashMovementsBySession({ sessionId: null });

      expect(result).toEqual({ data: [], error: null });
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe("createCashCut", () => {
    it("inserta el corte y devuelve la fila creada", async () => {
      const payload = { branch_id: "b1", cut_type: "shift" };
      const q = thenableQuery({ data: { id: "c1" }, error: null });
      supabase.from.mockReturnValue(q);

      const result = await createCashCut(payload);

      expect(supabase.from).toHaveBeenCalledWith("cash_cuts");
      expect(q.insert).toHaveBeenCalledWith(payload);
      expect(q.select).toHaveBeenCalledTimes(1);
      expect(q.single).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: { id: "c1" }, error: null });
    });
  });

  describe("insertCashCutDetails", () => {
    it("inserta el detalle por metodo de pago", async () => {
      const details = [{ cash_cut_id: "c1", payment_method_id: "pm1" }];
      const q = thenableQuery({ data: null, error: null });
      supabase.from.mockReturnValue(q);

      await insertCashCutDetails(details);

      expect(supabase.from).toHaveBeenCalledWith("cash_cut_details");
      expect(q.insert).toHaveBeenCalledWith(details);
    });
  });

  describe("closeCashRegisterSession", () => {
    it("invoca la RPC de cierre con el id de sesion", async () => {
      supabase.rpc.mockReturnValue(
        Promise.resolve({ data: { ok: true }, error: null })
      );

      const result = await closeCashRegisterSession({ sessionId: "s1" });

      expect(supabase.rpc).toHaveBeenCalledWith("close_cash_register_session", {
        p_session_id: "s1",
      });
      expect(result).toEqual({ data: { ok: true }, error: null });
    });
  });
});
