import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from "../../../../../lib/supabaseClient";
import {
  addInventoryToProduct,
  isAdminGrantRequiredError,
} from "./inventoryAddService";

const BRANCH_ID = "branch-1";
const PRODUCT_ID = "product-1";

const baseProduct = {
  product_id: PRODUCT_ID,
  descripcion: "Alimento para perro adulto 15 kg",
  costo: 100,
  precio: 250,
};

const rpcResult = {
  success: true,
  productId: PRODUCT_ID,
  previousStock: 10,
  newStock: 20,
  quantity: 10,
  previousCostPrice: 100,
  costPrice: 250,
};

describe("inventoryAddService", () => {
  beforeEach(() => {
    supabase.from.mockReset();
    supabase.rpc.mockReset();
    supabase.rpc.mockResolvedValue({ data: rpcResult, error: null });
  });

  describe("llamada a la RPC transaccional", () => {
    it("envia sucursal, producto, cantidad y costo de compra a add_inventory_entry", async () => {
      await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 10,
        incomingCostPrice: 400,
      });

      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      expect(supabase.rpc).toHaveBeenCalledWith("add_inventory_entry", {
        p_branch_id: BRANCH_ID,
        p_product_id: PRODUCT_ID,
        p_quantity: 10,
        p_incoming_cost: 400,
      });
    });

    it("no escribe tablas directamente desde el cliente", async () => {
      await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 1,
      });

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("acepta el id del producto caido en product.id", async () => {
      await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: { id: "product-2" },
        quantity: 1,
      });

      expect(supabase.rpc.mock.calls[0][1].p_product_id).toBe("product-2");
    });
  });

  describe("costo de compra", () => {
    it.each([
      ["undefined (entrada manual)", undefined],
      ["null explicito", null],
      ["no numerico", "abc"],
      ["infinito", Infinity],
    ])("envia null cuando el costo es %s", async (_label, cost) => {
      await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 1,
        incomingCostPrice: cost,
      });

      expect(supabase.rpc.mock.calls[0][1].p_incoming_cost).toBeNull();
    });

    it("envia costo cero en vez de null", async () => {
      await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 1,
        incomingCostPrice: 0,
      });

      expect(supabase.rpc.mock.calls[0][1].p_incoming_cost).toBe(0);
    });

    it("convierte un costo numerico en texto", async () => {
      await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 1,
        incomingCostPrice: "125.5",
      });

      expect(supabase.rpc.mock.calls[0][1].p_incoming_cost).toBe(125.5);
    });
  });

  describe("resultado", () => {
    it("devuelve stock y CPP antes y despues de la entrada", async () => {
      const result = await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 10,
        incomingCostPrice: 400,
      });

      expect(result).toEqual({
        productId: PRODUCT_ID,
        previousStock: 10,
        newStock: 20,
        quantity: 10,
        previousCostPrice: 100,
        costPrice: 250,
      });
    });

    it("normaliza a 0 los valores numericos ausentes", async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await addInventoryToProduct({
        branchId: BRANCH_ID,
        product: baseProduct,
        quantity: 3,
      });

      expect(result.previousCostPrice).toBe(0);
      expect(result.costPrice).toBe(0);
      expect(result.quantity).toBe(3);
    });
  });

  describe("validaciones", () => {
    it("rechaza ausencia de sucursal activa", async () => {
      await expect(
        addInventoryToProduct({ product: baseProduct, quantity: 1 })
      ).rejects.toThrow("No hay una sucursal activa");

      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("rechaza producto sin identificador", async () => {
      await expect(
        addInventoryToProduct({ branchId: BRANCH_ID, product: {}, quantity: 1 })
      ).rejects.toThrow("No se detectó el identificador del producto.");

      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it.each([0, -1, "abc"])(
      "rechaza cantidad invalida (%s)",
      async (quantity) => {
        await expect(
          addInventoryToProduct({
            branchId: BRANCH_ID,
            product: baseProduct,
            quantity,
          })
        ).rejects.toThrow("La cantidad debe ser mayor a 0.");

        expect(supabase.rpc).not.toHaveBeenCalled();
      }
    );
  });

  describe("propagacion de errores", () => {
    it("propaga el error de la RPC", async () => {
      const rpcError = new Error("No tienes acceso a esta sucursal.");
      supabase.rpc.mockResolvedValue({ data: null, error: rpcError });

      await expect(
        addInventoryToProduct({
          branchId: BRANCH_ID,
          product: baseProduct,
          quantity: 1,
        })
      ).rejects.toBe(rpcError);
    });
  });

  describe("isAdminGrantRequiredError", () => {
    it("reconoce el rechazo por su hint aunque cambie el texto", () => {
      expect(
        isAdminGrantRequiredError({
          code: "42501",
          hint: "ADMIN_GRANT_REQUIRED",
          message: "Texto reescrito por cualquier motivo.",
        })
      ).toBe(true);
    });

    it("sin el hint no lo reconoce aunque el mensaje coincida", () => {
      expect(
        isAdminGrantRequiredError({
          code: "42501",
          message:
            "Agregar inventario requiere la autorizacion de un administrador.",
        })
      ).toBe(false);
      expect(
        isAdminGrantRequiredError({
          code: "42501",
          hint: "OTRO_HINT",
          message:
            "Agregar inventario requiere la autorizacion de un administrador.",
        })
      ).toBe(false);
    });

    it("no confunde la falta de acceso a la sucursal con una autorizacion vencida", () => {
      expect(
        isAdminGrantRequiredError({
          code: "42501",
          message: "No tienes acceso a esta sucursal.",
        })
      ).toBe(false);
    });

    it("ignora otros errores y valores vacios", () => {
      expect(
        isAdminGrantRequiredError({
          code: "P0001",
          hint: "ADMIN_GRANT_REQUIRED",
          message: "requiere la autorizacion de un administrador",
        })
      ).toBe(false);
      expect(isAdminGrantRequiredError(null)).toBe(false);
    });
  });
});
