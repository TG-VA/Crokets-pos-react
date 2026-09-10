import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from "../../../../../lib/supabaseClient";
import {
  buildIsoDateRange,
  fetchCashSessions,
  fetchCashMovements,
  fetchPaymentMethodsSummary,
} from "./cashReportService";

const localMidnightIso = (dateLike) => {
  const d = new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const localEndOfDayIso = (dateLike) => {
  const d = new Date(dateLike);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

const thenableQuery = (resolve = { data: null, error: null }) => {
  const q = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    in: vi.fn(),
    ilike: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };

  Object.values(q).forEach((fn) => fn.mockReturnValue(q));
  q.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolve).then(onFulfilled, onRejected);

  return q;
};

const rpcBuilder = (resolve = { data: null, error: null }) => ({
  limit: vi.fn().mockReturnValue(Promise.resolve(resolve)),
});

const sessionRow = {
  session_id: "s1",
  user_id: "u1",
  username: "juan",
  branch_id: "b1",
  branch_name: "Sucursal Norte",
  branch_timezone: "America/Mexico_City",
  opening_amount: "100",
  closing_amount: "600",
  opened_at: "2026-09-01T09:00:00.000Z",
  closed_at: "2026-09-01T19:00:00.000Z",
  session_status: "closed",
  difference: "0",
  cash_sales: "500",
  card_sales: "300",
  total_sales: "800",
  cash_cuts: [{ id: "cut1", amount: "120" }],
};

describe("cashReportService", () => {
  beforeEach(() => {
    supabase.from.mockReset();
    supabase.rpc.mockReset();
  });

  describe("buildIsoDateRange", () => {
    it("normaliza el rango a inicio/fin del dia local", () => {
      const { startIso, endIso } = buildIsoDateRange(
        new Date("2026-09-10T15:30:00.000Z")
      );
      const start = new Date(startIso);
      const end = new Date(endIso);

      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
      expect(end - start).toBe(24 * 60 * 60 * 1000 - 1);
    });

    it("devuelve nulls si no hay fecha", () => {
      expect(buildIsoDateRange(null, null)).toEqual({
        startIso: null,
        endIso: null,
      });
    });
  });

  describe("fetchCashSessions", () => {
    it("invoca la RPC con filtros ALL a null y rango ISO", async () => {
      supabase.rpc.mockReturnValue(rpcBuilder({ data: [], error: null }));

      const startInput = new Date("2026-09-01T10:00:00.000Z");
      const endInput = new Date("2026-09-10T10:00:00.000Z");

      await fetchCashSessions({
        startDate: startInput,
        endDate: endInput,
      });

      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      const [fnName, params] = supabase.rpc.mock.calls[0];
      expect(fnName).toBe("get_cash_report_sessions");
      expect(params.p_branch_id).toBe(null);
      expect(params.p_cashier_id).toBe(null);
      expect(params.p_session_status).toBe(null);
      expect(params.p_start_date).toBe(localMidnightIso(startInput));
      expect(params.p_end_date).toBe(localEndOfDayIso(endInput));
      expect(supabase.rpc.mock.results[0].value.limit).toHaveBeenCalledWith(100000);
    });

    it("envia los ids de filtro cuando no son ALL", async () => {
      supabase.rpc.mockReturnValue(rpcBuilder({ data: [], error: null }));

      await fetchCashSessions({
        branchId: "b1",
        cashierId: "u1",
        sessionStatus: "closed",
      });

      expect(supabase.rpc.mock.calls[0][1]).toMatchObject({
        p_branch_id: "b1",
        p_cashier_id: "u1",
        p_session_status: "closed",
      });
    });

    it("devuelve [] cuando la RPC no devuelve sesiones", async () => {
      supabase.rpc.mockReturnValue(rpcBuilder({ data: [], error: null }));

      const result = await fetchCashSessions({});

      expect(result).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("consulta movimientos en lote con los id de sesion y sin cap bajo", async () => {
      supabase.rpc.mockReturnValue(rpcBuilder({ data: [sessionRow], error: null }));
      const movQ = thenableQuery({ data: [], error: null });
      supabase.from.mockReturnValue(movQ);

      await fetchCashSessions({});

      expect(supabase.from).toHaveBeenCalledWith("cash_movements");
      expect(movQ.select).toHaveBeenCalledWith(
        "id, session_id, movement_type, amount"
      );
      expect(movQ.in).toHaveBeenCalledWith("session_id", ["s1"]);
      expect(movQ.limit).toHaveBeenCalledWith(100000);
    });

    it("mapea cada sesion al shape del hook con expectedCash", async () => {
      supabase.rpc.mockReturnValue(rpcBuilder({ data: [sessionRow], error: null }));
      const movQ = thenableQuery({
        data: [
          { session_id: "s1", movement_type: "ENTRADA", amount: "50" },
          { session_id: "s1", movement_type: "SALIDA", amount: "20" },
        ],
        error: null,
      });
      supabase.from.mockReturnValue(movQ);

      const result = await fetchCashSessions({});

      expect(result).toEqual([
        {
          id: "s1",
          user_id: "u1",
          branch_id: "b1",
          opening_amount: "100",
          closing_amount: "600",
          opened_at: "2026-09-01T09:00:00.000Z",
          closed_at: "2026-09-01T19:00:00.000Z",
          status: "closed",
          difference: "0",
          users: { id: "u1", username: "juan" },
          branches: {
            id: "b1",
            name: "Sucursal Norte",
            timezone: "America/Mexico_City",
          },
          cash_cuts: [{ id: "cut1", amount: "120" }],
          cashSales: 500,
          cardSales: 300,
          totalSales: 800,
          manualIn: 50,
          manualOut: 20,
          expectedCash: 100 + 500 + 50 - 20,
        },
      ]);
    });

    it("clasifica movimientos por alias de entrada/salida", async () => {
      supabase.rpc.mockReturnValue(rpcBuilder({ data: [sessionRow], error: null }));
      const movQ = thenableQuery({
        data: [
          { session_id: "s1", movement_type: "ingreso de capital", amount: "10" },
          { session_id: "s1", movement_type: "deposito entrada", amount: "15" },
          { session_id: "s1", movement_type: "retiro", amount: "7" },
          { session_id: "s1", movement_type: "gasto", amount: "3" },
        ],
        error: null,
      });
      supabase.from.mockReturnValue(movQ);

      const [session] = await fetchCashSessions({});

      expect(session.manualIn).toBe(25);
      expect(session.manualOut).toBe(10);
    });

    it("mantiene sesiones con movimiento 0 si la consulta de movimientos falla", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      supabase.rpc.mockReturnValue(rpcBuilder({ data: [sessionRow], error: null }));
      supabase.from.mockReturnValue(
        thenableQuery({ data: null, error: { message: "boom" } })
      );

      const result = await fetchCashSessions({});
      const [session] = result;

      expect(session.manualIn).toBe(0);
      expect(session.manualOut).toBe(0);
      expect(session.expectedCash).toBe(100 + 500 + 0 - 0);
      spy.mockRestore();
    });

    it("relanza el error si la RPC de sesiones falla", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      supabase.rpc.mockReturnValue(
        rpcBuilder({ data: null, error: { message: "boom" } })
      );

      await expect(fetchCashSessions({})).rejects.toMatchObject({
        message: "boom",
      });
      spy.mockRestore();
    });
  });

  describe("fetchCashMovements", () => {
    it("construye la query con filtros y limite de movimientos", async () => {
      const movQ = thenableQuery({ data: [], error: null });
      supabase.from.mockReturnValue(movQ);

      const startInput = new Date("2026-09-01T10:00:00.000Z");
      const endInput = new Date("2026-09-10T10:00:00.000Z");

      await fetchCashMovements({
        branchId: "b1",
        cashierId: "u1",
        movementType: "retiro",
        startDate: startInput,
        endDate: endInput,
      });

      expect(supabase.from).toHaveBeenCalledWith("cash_movements");
      expect(movQ.eq).toHaveBeenCalledWith("branch_id", "b1");
      expect(movQ.eq).toHaveBeenCalledWith("user_id", "u1");
      expect(movQ.ilike).toHaveBeenCalledWith("movement_type", "%retiro%");
      expect(movQ.gte).toHaveBeenCalledWith(
        "created_at",
        localMidnightIso(startInput)
      );
      expect(movQ.lte).toHaveBeenCalledWith(
        "created_at",
        localEndOfDayIso(endInput)
      );
      expect(movQ.limit).toHaveBeenCalledWith(10000);
    });

    it("relanza error si falla la consulta", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      supabase.from.mockReturnValue(
        thenableQuery({ data: null, error: { message: "boom" } })
      );

      await expect(fetchCashMovements({})).rejects.toMatchObject({
        message: "boom",
      });
      spy.mockRestore();
    });
  });

  describe("fetchPaymentMethodsSummary", () => {
    it("agrega pagos por metodo y ordena por monto descendente", async () => {
      const payQ = thenableQuery({
        data: [
          {
            id: "p1",
            payment_method_id: "cash",
            amount: "100",
            payment_methods: { name: "Efectivo", affects_cash: true },
          },
          {
            id: "p2",
            payment_method_id: "cash",
            amount: "50",
            payment_methods: { name: "Efectivo", affects_cash: true },
          },
          {
            id: "p3",
            payment_method_id: "card",
            amount: "200",
            payment_methods: { name: "Tarjeta", affects_cash: false },
          },
        ],
        error: null,
      });
      supabase.from.mockReturnValue(payQ);

      const result = await fetchPaymentMethodsSummary({});

      expect(supabase.from).toHaveBeenCalledWith("sale_payments");
      expect(payQ.in).toHaveBeenCalledWith("sales.status", [
        "completed",
        "partial_refund",
      ]);
      expect(result).toEqual([
        {
          id: "card",
          methodName: "Tarjeta",
          affectsCash: false,
          count: 1,
          amount: 200,
        },
        {
          id: "cash",
          methodName: "Efectivo",
          affectsCash: true,
          count: 2,
          amount: 150,
        },
      ]);
    });

    it("devuelve [] si la consulta falla", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      supabase.from.mockReturnValue(
        thenableQuery({ data: null, error: { message: "boom" } })
      );

      const result = await fetchPaymentMethodsSummary({});

      expect(result).toEqual([]);
      spy.mockRestore();
    });
  });
});