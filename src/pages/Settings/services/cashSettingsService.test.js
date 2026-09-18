import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from "../../../lib/supabaseClient";
import {
  getCashMaxOpeningAmount,
  updateCashMaxOpeningAmount,
} from "./cashSettingsService";

describe("cashSettingsService", () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
  });

  describe("getCashMaxOpeningAmount", () => {
    it("devuelve el tope vigente como número", async () => {
      supabase.rpc.mockResolvedValue({ data: 1000000, error: null });

      const result = await getCashMaxOpeningAmount();

      expect(supabase.rpc).toHaveBeenCalledWith("get_cash_max_opening_amount");
      expect(result.success).toBe(true);
      expect(result.amount).toBe(1000000);
      expect(result.error).toBeNull();
    });

    it("devuelve null cuando el tope es nulo", async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await getCashMaxOpeningAmount();

      expect(result.success).toBe(true);
      expect(result.amount).toBeNull();
    });

    it("captura errores de transporte del RPC", async () => {
      supabase.rpc.mockResolvedValue({
        data: null,
        error: { message: "boom" },
      });

      const result = await getCashMaxOpeningAmount();

      expect(result.success).toBe(false);
      expect(result.error).toBe("boom");
    });
  });

  describe("updateCashMaxOpeningAmount", () => {
    it("rechaza montos no numéricos sin llamar la RPC", async () => {
      const result = await updateCashMaxOpeningAmount("abc");

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it("rechaza la entrada vacía o de solo espacios sin llamar la RPC", async () => {
      const result = await updateCashMaxOpeningAmount("");

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain("vacío");

      const whitespaceResult = await updateCashMaxOpeningAmount("   ");

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(whitespaceResult.success).toBe(false);
      expect(whitespaceResult.error).toContain("vacío");
    });

    it("envía el monto y devuelve el valor guardado", async () => {
      supabase.rpc.mockResolvedValue({
        data: { success: true, amount: 750000 },
        error: null,
      });

      const result = await updateCashMaxOpeningAmount("750000");

      expect(supabase.rpc).toHaveBeenCalledWith(
        "update_cash_max_opening_amount",
        { p_amount: 750000 }
      );
      expect(result.success).toBe(true);
      expect(result.amount).toBe(750000);
    });

    it("propaga la respuesta de negocio fallida", async () => {
      supabase.rpc.mockResolvedValue({
        data: {
          success: false,
          message: "Solo un administrador puede modificar el tope.",
        },
        error: null,
      });

      const result = await updateCashMaxOpeningAmount(500);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Solo un administrador puede modificar el tope."
      );
    });

    it("captura errores de transporte del RPC", async () => {
      supabase.rpc.mockResolvedValue({
        data: null,
        error: { message: "boom" },
      });

      const result = await updateCashMaxOpeningAmount(500);

      expect(result.success).toBe(false);
      expect(result.error).toBe("boom");
    });
  });
});
