import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

vi.mock("./ordersDetailService", () => ({
  STORE_ORDER_SELECT: "id",
  fetchStoreOrderById: vi.fn(),
}));

import { supabase } from "../../../../../lib/supabaseClient";
import { fetchStoreOrderById } from "./ordersDetailService";
import {
  countPendingStoreOrders,
  createStoreOrder,
  receiveStoreOrder,
} from "./ordersService";

const baseDraft = {
  orderName: "Reposicion semanal",
  originBranchId: "branch-1",
  destinationBranchId: "branch-2",
  user: { id: "user-1" },
  items: [
    {
      productId: "product-1",
      productName: "Croqueta",
      expectedQty: 2,
    },
  ],
};

const pendingOrder = {
  id: "order-1",
  status: "pending",
  toBranchId: "branch-2",
  items: [
    {
      productId: "product-1",
      productName: "Croqueta",
      expectedQty: 2,
    },
  ],
};

describe("ordersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createStoreOrder", () => {
    it("envia el nombre del pedido en mayusculas y sin espacios sobrantes", async () => {
      supabase.rpc.mockResolvedValue({
        data: { success: true, orderId: "order-1" },
        error: null,
      });
      fetchStoreOrderById.mockResolvedValue({ id: "order-1" });

      await createStoreOrder({
        ...baseDraft,
        orderName: "  Reposición semanal ",
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        "create_store_order",
        expect.objectContaining({ p_order_name: "REPOSICIÓN SEMANAL" })
      );
    });

    it("rechaza cantidades fraccionarias antes de llamar a la RPC", async () => {
      await expect(
        createStoreOrder({
          ...baseDraft,
          items: [{ ...baseDraft.items[0], expectedQty: 2.5 }],
        })
      ).rejects.toThrow(/numero entero mayor a cero/);

      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("rechaza productos locales antes de llamar a la RPC", async () => {
      await expect(
        createStoreOrder({
          ...baseDraft,
          items: [{ ...baseDraft.items[0], isGlobal: false }],
        })
      ).rejects.toThrow(/local o no global/);

      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("falla con mensaje explicito si la RPC crea el pedido pero no se puede releer", async () => {
      supabase.rpc.mockResolvedValue({
        data: { success: true, orderId: "order-1" },
        error: null,
      });
      fetchStoreOrderById.mockResolvedValue(null);

      await expect(createStoreOrder(baseDraft)).rejects.toThrow(
        /no se pudo recuperar su detalle/
      );

      expect(supabase.rpc).toHaveBeenCalledTimes(1);
    });

    it("devuelve el snapshot completo cuando la relectura funciona", async () => {
      const snapshot = { id: "order-1", orderNumber: "PED-1" };

      supabase.rpc.mockResolvedValue({
        data: { success: true, orderId: "order-1" },
        error: null,
      });
      fetchStoreOrderById.mockResolvedValue(snapshot);

      await expect(createStoreOrder(baseDraft)).resolves.toBe(snapshot);
      expect(fetchStoreOrderById).toHaveBeenCalledWith("order-1");
    });
  });

  describe("receiveStoreOrder", () => {
    it("rechaza cantidades fraccionarias antes de llamar a la RPC", async () => {
      await expect(
        receiveStoreOrder({
          order: pendingOrder,
          currentBranchId: "branch-2",
          quantities: { "product-1": "1.5" },
          user: { id: "user-1" },
        })
      ).rejects.toThrow(/cantidades enteras/);

      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("falla con mensaje explicito si la recepcion no se puede releer", async () => {
      supabase.rpc.mockResolvedValue({
        data: { success: true, orderId: "order-1" },
        error: null,
      });
      fetchStoreOrderById.mockResolvedValue(null);

      await expect(
        receiveStoreOrder({
          order: pendingOrder,
          currentBranchId: "branch-2",
          quantities: { "product-1": "2" },
          user: { id: "user-1" },
        })
      ).rejects.toThrow(/no se pudo recuperar el pedido/);
    });
  });

  describe("countPendingStoreOrders", () => {
    it("consulta solo el conteo de pendientes de la sucursal", async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn(),
      };

      mockFrom.eq
        .mockReturnValueOnce(mockFrom)
        .mockResolvedValueOnce({ count: 3, error: null });

      supabase.from.mockReturnValue(mockFrom);

      await expect(countPendingStoreOrders("branch-2")).resolves.toBe(3);

      expect(supabase.from).toHaveBeenCalledWith("store_orders");
      expect(mockFrom.select).toHaveBeenCalledWith("id", {
        count: "exact",
        head: true,
      });
      expect(mockFrom.eq).toHaveBeenNthCalledWith(1, "status", "pending");
      expect(mockFrom.eq).toHaveBeenNthCalledWith(
        2,
        "to_branch_id",
        "branch-2"
      );
    });

    it("no consulta cuando no hay sucursal activa", async () => {
      await expect(countPendingStoreOrders("")).resolves.toBe(0);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("propaga el error de la consulta", async () => {
      const error = new Error("boom");
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn(),
      };

      mockFrom.eq
        .mockReturnValueOnce(mockFrom)
        .mockResolvedValueOnce({ count: null, error });

      supabase.from.mockReturnValue(mockFrom);

      await expect(countPendingStoreOrders("branch-2")).rejects.toBe(error);
    });
  });
});
