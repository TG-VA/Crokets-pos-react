import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from "../lib/supabaseClient";
import { fetchActiveCashSession, openCashRegister } from "./cashRegisterService";

describe("cashRegisterService", () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
  });

  describe("fetchActiveCashSession", () => {
    it("rechaza la llamada sin branchId", async () => {
      const result = await fetchActiveCashSession(null);

      expect(result.success).toBe(false);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("devuelve la sesión activa con su dueño", async () => {
      const session = { id: "s1", user_id: "u1", username: "CAJERO" };
      supabase.rpc.mockResolvedValue({ data: { success: true, session }, error: null });

      const result = await fetchActiveCashSession("branch-1");

      expect(supabase.rpc).toHaveBeenCalledWith("get_cash_register_session", {
        p_branch_id: "branch-1",
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(session);
    });

    it("devuelve data null cuando no hay caja abierta", async () => {
      supabase.rpc.mockResolvedValue({ data: { success: true, session: null }, error: null });

      const result = await fetchActiveCashSession("branch-1");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it("captura errores de transporte del RPC", async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });

      const result = await fetchActiveCashSession("branch-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("boom");
    });
  });

  describe("openCashRegister", () => {
    it("rechaza la llamada sin branchId", async () => {
      const result = await openCashRegister(null, 100);

      expect(result.success).toBe(false);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("abre la caja y devuelve la sesión creada", async () => {
      const session = { id: "s2", user_id: "u1", opening_amount: 100 };
      supabase.rpc.mockResolvedValue({ data: { success: true, session }, error: null });

      const result = await openCashRegister("branch-1", 100);

      expect(supabase.rpc).toHaveBeenCalledWith("open_cash_register", {
        p_branch_id: "branch-1",
        p_opening_amount: 100,
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(session);
      expect(result.code).toBeNull();
    });

    it("expone el código de negocio cuando ya hay una caja abierta", async () => {
      const session = { id: "s1", user_id: "u2", username: "OTRO" };
      supabase.rpc.mockResolvedValue({
        data: {
          success: false,
          session,
          code: "CASH_ALREADY_OPEN_BY_OTHER_USER",
          message: "Ya existe una caja abierta en esta sucursal por OTRO. Debe cerrarse antes de abrir otra caja.",
        },
        error: null,
      });

      const result = await openCashRegister("branch-1", 100);

      expect(result.success).toBe(false);
      expect(result.data).toEqual(session);
      expect(result.code).toBe("CASH_ALREADY_OPEN_BY_OTHER_USER");
      expect(result.message).toContain("Ya existe una caja abierta");
    });

    it("captura errores de transporte del RPC", async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: { message: "rpc fail" } });

      const result = await openCashRegister("branch-1", 100);

      expect(result.success).toBe(false);
      expect(result.error).toBe("rpc fail");
    });
  });
});
