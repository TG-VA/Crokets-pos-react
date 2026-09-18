import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from "../../../lib/supabaseClient";
import { createSaleTransaction } from "./salesTransactionService";

const basePayload = {
  branchId: "branch-1",
  userId: "user-1",
  subtotal: 100,
  tax: 16,
  total: 116,
  saleDate: "2026-09-17T18:00:00.000Z",
  productsPayload: [{ product_id: "p-1", quantity: 2 }],
  paymentsPayload: [{ payment_method_id: "m-1", amount: 116 }],
  saleToken: "token-1",
};

describe("salesTransactionService.createSaleTransaction", () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
  });

  describe("guardas de entrada", () => {
    it("rechaza la venta sin sucursal", async () => {
      await expect(
        createSaleTransaction({ ...basePayload, branchId: null })
      ).rejects.toThrow("No se detectó la sucursal.");
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("rechaza la venta sin usuario", async () => {
      await expect(
        createSaleTransaction({ ...basePayload, userId: "" })
      ).rejects.toThrow("No se detectó el usuario.");
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("rechaza la venta sin token de venta", async () => {
      await expect(
        createSaleTransaction({ ...basePayload, saleToken: null })
      ).rejects.toThrow("No se generó el token de venta.");
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("rechaza la venta sin productos", async () => {
      await expect(
        createSaleTransaction({ ...basePayload, productsPayload: [] })
      ).rejects.toThrow("La venta no contiene productos válidos.");
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("rechaza productos que no son arreglo", async () => {
      await expect(
        createSaleTransaction({ ...basePayload, productsPayload: null })
      ).rejects.toThrow("La venta no contiene productos válidos.");
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("rechaza pagos que no son arreglo", async () => {
      await expect(
        createSaleTransaction({ ...basePayload, paymentsPayload: null })
      ).rejects.toThrow("Los pagos de la venta no son válidos.");
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("acepta un arreglo de pagos vacío", async () => {
      supabase.rpc.mockResolvedValue({ data: "sale-1", error: null });

      await expect(
        createSaleTransaction({ ...basePayload, paymentsPayload: [] })
      ).resolves.toBe("sale-1");
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
    });
  });

  describe("mapeo de parámetros", () => {
    it("llama al RPC create_sale_transaction con el contrato snake_case", async () => {
      supabase.rpc.mockResolvedValue({ data: "sale-1", error: null });

      const saleId = await createSaleTransaction(basePayload);

      expect(saleId).toBe("sale-1");
      expect(supabase.rpc).toHaveBeenCalledWith("create_sale_transaction", {
        p_branch_id: "branch-1",
        p_user_id: "user-1",
        p_customer_id: null,
        p_subtotal: 100,
        p_tax: 16,
        p_total: 116,
        p_sale_date: "2026-09-17T18:00:00.000Z",
        p_products: basePayload.productsPayload,
        p_payments: basePayload.paymentsPayload,
        p_client_sale_token: "token-1",
        p_notes: null,
      });
    });

    it("convierte montos a número y normaliza el cliente opcional", async () => {
      supabase.rpc.mockResolvedValue({ data: "sale-2", error: null });

      await createSaleTransaction({
        ...basePayload,
        customerId: "customer-9",
        subtotal: "100.5",
        tax: undefined,
        total: "116.5",
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        "create_sale_transaction",
        expect.objectContaining({
          p_customer_id: "customer-9",
          p_subtotal: 100.5,
          p_tax: 0,
          p_total: 116.5,
        })
      );
    });

    it("recorta las notas y usa null cuando quedan vacías", async () => {
      supabase.rpc.mockResolvedValue({ data: "sale-3", error: null });

      await createSaleTransaction({
        ...basePayload,
        notes: "  cliente frecuente  ",
      });
      expect(supabase.rpc).toHaveBeenLastCalledWith(
        "create_sale_transaction",
        expect.objectContaining({ p_notes: "cliente frecuente" })
      );

      await createSaleTransaction({ ...basePayload, notes: "   " });
      expect(supabase.rpc).toHaveBeenLastCalledWith(
        "create_sale_transaction",
        expect.objectContaining({ p_notes: null })
      );
    });

    it("genera una fecha ISO cuando no se envía saleDate", async () => {
      supabase.rpc.mockResolvedValue({ data: "sale-4", error: null });

      await createSaleTransaction({ ...basePayload, saleDate: undefined });

      const [, params] = supabase.rpc.mock.calls[0];
      expect(typeof params.p_sale_date).toBe("string");
      expect(Number.isNaN(new Date(params.p_sale_date).getTime())).toBe(false);
    });
  });

  describe("errores de la RPC", () => {
    it("propaga el error de transporte", async () => {
      const error = { message: "duplicate sale token", code: "23505" };
      supabase.rpc.mockResolvedValue({ data: null, error });

      await expect(createSaleTransaction(basePayload)).rejects.toEqual(error);
    });

    it("falla si la RPC no devuelve identificador", async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: null });

      await expect(createSaleTransaction(basePayload)).rejects.toThrow(
        "La venta se procesó sin devolver un identificador."
      );
    });
  });
});
