import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("../../../../../utils/inventoryMovements", () => ({
  getSystemLocalTimestamp: vi.fn(() => "2026-10-28T12:00:00"),
  logInventoryMovement: vi.fn(),
}));

import { supabase } from "../../../../../lib/supabaseClient";
import { logInventoryMovement } from "../../../../../utils/inventoryMovements";
import { applyInventoryAdjustment } from "./inventoryAdjustmentService";

const BRANCH_ID = "branch-1";

const buildQuery = (row) => {
  const q = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };

  q.select.mockReturnValue(q);
  q.insert.mockResolvedValue({ error: null });
  q.update.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  q.maybeSingle.mockResolvedValue({ data: row, error: null });
  q.then = (onFulfilled, onRejected) =>
    Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected);

  return q;
};

const product = {
  product_id: "product-1",
  descripcion: "Alimento adulto 2 kg",
  costo: 197,
  precio: 289,
};

describe("inventoryAdjustmentService", () => {
  beforeEach(() => {
    supabase.from.mockReset();
    logInventoryMovement.mockReset();
    logInventoryMovement.mockResolvedValue({ success: true });
  });

  it("no escribe sale_price al ajustar una fila existente con precio", async () => {
    const q = buildQuery({ id: "inv-1", stock: 5, has_been_stocked: true });
    supabase.from.mockReturnValue(q);

    await applyInventoryAdjustment({
      branchId: BRANCH_ID,
      product,
      quantity: 3,
      reason: "Conteo",
    });

    const payload = q.update.mock.calls[0][0];
    expect(payload.stock).toBe(8);
    expect(payload).not.toHaveProperty("sale_price");
  });

  it("no escribe sale_price al ajustar una fila existente sin precio", async () => {
    const q = buildQuery({ id: "inv-1", stock: 5, has_been_stocked: true });
    supabase.from.mockReturnValue(q);

    await applyInventoryAdjustment({
      branchId: BRANCH_ID,
      product: { ...product, precio: undefined },
      quantity: -2,
      reason: "Merma",
    });

    const payload = q.update.mock.calls[0][0];
    expect(payload.stock).toBe(3);
    expect(payload).not.toHaveProperty("sale_price");
  });

  it("fija sale_price solo en el alta de una fila nueva", async () => {
    const q = buildQuery(null);
    supabase.from.mockReturnValue(q);

    await applyInventoryAdjustment({
      branchId: BRANCH_ID,
      product,
      quantity: 4,
      reason: "Alta",
    });

    expect(q.update).not.toHaveBeenCalled();
    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({ stock: 4, sale_price: 289 })
    );
  });
});
