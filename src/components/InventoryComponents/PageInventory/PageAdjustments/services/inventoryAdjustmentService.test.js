import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}));

import { supabase } from "../../../../../lib/supabaseClient";
import {
  applyInventoryAdjustment,
  isAdminGrantRequiredError,
} from "./inventoryAdjustmentService";

const BRANCH_ID = "branch-1";

const product = {
  product_id: "product-1",
  descripcion: "Alimento adulto 2 kg",
  costo: 197,
  precio: 289,
};

describe("inventoryAdjustmentService", () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
    supabase.from.mockReset();
  });

  it("delega el ajuste en la RPC transaccional sin escribir tablas desde el cliente", async () => {
    supabase.rpc.mockResolvedValue({
      data: { previousStock: 5, newStock: 3 },
      error: null,
    });

    const result = await applyInventoryAdjustment({
      branchId: BRANCH_ID,
      product,
      quantity: -2,
      reason: "  Merma ",
      notes: " bolsa rota ",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("apply_inventory_adjustment", {
      p_branch_id: BRANCH_ID,
      p_product_id: "product-1",
      p_quantity: -2,
      p_reason: "Merma",
      p_notes: "bolsa rota",
    });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(result).toEqual({
      productId: "product-1",
      previousStock: 5,
      newStock: 3,
      quantity: -2,
    });
  });

  it("no envia costo: el ajuste no altera el CPP de la sucursal", async () => {
    supabase.rpc.mockResolvedValue({ data: {}, error: null });

    await applyInventoryAdjustment({
      branchId: BRANCH_ID,
      product,
      quantity: 3,
      reason: "Conteo",
    });

    const [, params] = supabase.rpc.mock.calls[0];
    expect(Object.keys(params).some((key) => key.includes("cost"))).toBe(false);
    expect(params.p_notes).toBeNull();
  });

  it.each(["NEGATIVE_STOCK", "INVENTORY_NOT_REGISTERED"])(
    "traduce el hint %s de la RPC al code que muestra la pantalla",
    async (hint) => {
      supabase.rpc.mockResolvedValue({
        data: null,
        error: { code: "P0001", message: "rechazo", hint },
      });

      await expect(
        applyInventoryAdjustment({
          branchId: BRANCH_ID,
          product,
          quantity: -9,
          reason: "Merma",
        })
      ).rejects.toMatchObject({ code: hint, message: "rechazo" });
    }
  );

  it("propaga sin cambios los demas errores de la RPC", async () => {
    const rpcError = { code: "42501", message: "No tienes acceso" };
    supabase.rpc.mockResolvedValue({ data: null, error: rpcError });

    await expect(
      applyInventoryAdjustment({
        branchId: BRANCH_ID,
        product,
        quantity: 1,
        reason: "Conteo",
      })
    ).rejects.toBe(rpcError);
  });

  it("valida en el cliente antes de llamar la RPC", async () => {
    await expect(
      applyInventoryAdjustment({
        branchId: BRANCH_ID,
        product,
        quantity: 0,
        reason: "x",
      })
    ).rejects.toThrow("La diferencia debe ser distinta de 0.");
    await expect(
      applyInventoryAdjustment({
        branchId: BRANCH_ID,
        product,
        quantity: 1,
        reason: " ",
      })
    ).rejects.toThrow("Captura el motivo del ajuste.");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("reconoce el 42501 de autorizacion por su hint", () => {
    expect(
      isAdminGrantRequiredError({
        code: "42501",
        hint: "ADMIN_GRANT_REQUIRED",
        message: "Texto reescrito por cualquier motivo.",
      })
    ).toBe(true);
    expect(
      isAdminGrantRequiredError({
        code: "P0001",
        hint: "ADMIN_GRANT_REQUIRED",
        message: "",
      })
    ).toBe(false);
    expect(
      isAdminGrantRequiredError({
        code: "42501",
        hint: "OTRO_HINT",
        message:
          "Ajustar inventario requiere la autorizacion de un administrador.",
      })
    ).toBe(false);
  });

  it("no depende del texto del mensaje cuando falta el hint", () => {
    expect(
      isAdminGrantRequiredError({
        code: "42501",
        message:
          "Ajustar inventario requiere la autorizacion de un administrador.",
      })
    ).toBe(false);
    expect(
      isAdminGrantRequiredError({
        code: "42501",
        message: "No tienes acceso a esta sucursal.",
      })
    ).toBe(false);
  });
});
