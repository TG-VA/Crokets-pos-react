import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    auth: { getSession: vi.fn() },
  },
}));

import { supabase } from "../lib/supabaseClient";
import { logInventoryMovement } from "./inventoryMovements";

const CACHE_KEY = "inventoryMovementsSelectedTable_v1";

const insertQuery = (resolve = { data: null, error: null }) => {
  const q = {
    insert: vi.fn(),
    select: vi.fn(),
    limit: vi.fn(),
    then: (onFulfilled, onRejected) =>
      Promise.resolve(resolve).then(onFulfilled, onRejected),
  };

  q.insert.mockReturnValue(q);
  q.select.mockReturnValue(q);
  q.limit.mockReturnValue(q);

  return q;
};

const baseMovement = {
  branchId: "branch-1",
  productId: "product-1",
  movementType: "adjustment",
  quantity: 5,
  previousStock: 10,
  newStock: 15,
  reason: "Ajuste por merma",
  userId: "user-1",
  createdAt: "2026-10-02T12:00:00",
};

describe("inventoryMovements - columnas de costo", () => {
  let q;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(CACHE_KEY, "inventory_movements");

    q = insertQuery();
    supabase.from.mockReset();
    supabase.auth.getSession.mockReset();
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
    supabase.from.mockReturnValue(q);
  });

  it("guarda unit_cost y total_cost cuando la entrada si informa el costo", async () => {
    await logInventoryMovement({
      ...baseMovement,
      movementType: "inventory_add",
      unitCost: 400,
      totalCost: 4000,
    });

    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        movement_type: "inventory_add",
        unit_cost: 400,
        total_cost: 4000,
      })
    );
  });

  it("guarda null en unit_cost y total_cost cuando el movimiento no informa costo", async () => {
    await logInventoryMovement(baseMovement);

    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        movement_type: "adjustment",
        unit_cost: null,
        total_cost: null,
      })
    );
  });

  it("guarda null en las columnas de costo cuando se pasan null explicito", async () => {
    await logInventoryMovement({
      ...baseMovement,
      unitCost: null,
      totalCost: null,
    });

    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({ unit_cost: null, total_cost: null })
    );
  });

  it("no confunde un null explicito con un costo cero", async () => {
    await logInventoryMovement({
      ...baseMovement,
      unitCost: null,
      totalCost: 4000,
    });

    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({ unit_cost: null, total_cost: 4000 })
    );
  });

  it("normaliza strings numericos en las columnas de costo", async () => {
    await logInventoryMovement({
      ...baseMovement,
      unitCost: "100.50",
      totalCost: "502.50",
    });

    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({ unit_cost: 100.5, total_cost: 502.5 })
    );
  });

  it("protege contra costos negativos con la decision R2", async () => {
    await logInventoryMovement({
      ...baseMovement,
      unitCost: -50,
      totalCost: -250,
    });

    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({ unit_cost: 0, total_cost: 0 })
    );
  });

  it("deja en null los costos no finitos en vez de persistir NaN", async () => {
    await logInventoryMovement({
      ...baseMovement,
      unitCost: NaN,
      totalCost: Infinity,
    });

    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({ unit_cost: null, total_cost: null })
    );
  });

  it("omite las columnas de costo en el fallback cuando el remoto no las tiene", async () => {
    const first = insertQuery({
      data: null,
      error: new Error('column "unit_cost" does not exist'),
    });

    const retry = insertQuery({ data: null, error: null });

    supabase.from.mockReturnValueOnce(first).mockReturnValueOnce(retry);

    const result = await logInventoryMovement({
      ...baseMovement,
      unitCost: 400,
      totalCost: 4000,
    });

    expect(retry.insert).toHaveBeenCalledTimes(1);
    const fallbackPayload = retry.insert.mock.calls[0][0];

    expect(fallbackPayload).not.toHaveProperty("unit_cost");
    expect(fallbackPayload).not.toHaveProperty("total_cost");
    expect(result).toEqual({ success: true, skipped: false, error: null });
  });
});
