import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

vi.mock("../utils/transfersUtils", () => ({
  createTransferFolio: () => "TR-010126-000000",
  normalizeTransferOrder: (data) => data,
}));

vi.mock("./transfersDetailService", () => ({
  TRANSFER_SELECT: "id",
  fetchTransferOrderById: vi.fn(),
}));

import { supabase } from "../../../../../lib/supabaseClient";
import { fetchTransferOrderById } from "./transfersDetailService";
import {
  fetchTransferBranchOptions,
  createTransferOrder,
  receiveTransferOrder,
  cancelTransferOrder,
} from "./transfersService";

const mockFrom = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: [], error: null }),
};

describe("transfersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue(mockFrom);
  });

  describe("fetchTransferBranchOptions", () => {
    it("devuelve las sucursales ordenadas cuando la consulta exito", async () => {
      mockFrom.order.mockResolvedValueOnce({
        data: [
          { id: "b1", name: "Centro", code: "CTR" },
          { id: "b2", name: "Norte", code: "NTE" },
        ],
        error: null,
      });

      const result = await fetchTransferBranchOptions({ id: "b1" });
      expect(result).toHaveLength(2);
      expect(supabase.from).toHaveBeenCalledWith("branches");
    });

    it("devuelve arreglo vacio si data no es arreglo", async () => {
      mockFrom.order.mockResolvedValueOnce({ data: null, error: null });
      const result = await fetchTransferBranchOptions({ id: "b1" });
      expect(result).toEqual([]);
    });

    it("devuelve fallback de la sucursal actual si la consulta falla", async () => {
      mockFrom.order.mockResolvedValueOnce({
        data: null,
        error: new Error("RLS"),
      });
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await fetchTransferBranchOptions({
        id: "b1",
        name: "Centro",
        code: "CTR",
      });
      expect(result).toEqual([{ id: "b1", name: "Centro", code: "CTR" }]);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe("createTransferOrder", () => {
    const baseArgs = {
      originBranch: { id: "b1" },
      destinationBranch: { id: "b2" },
      items: [{ productId: "p1", quantity: 5, costo: 10, precio: 20 }],
      notes: "Urgente",
      user: { id: "u1" },
    };

    beforeEach(() => {
      supabase.rpc.mockResolvedValue({
        data: { success: true, transferId: "t1" },
        error: null,
      });
      fetchTransferOrderById.mockResolvedValue({ id: "t1" });
    });

    it("rechaza sin sucursal origen", async () => {
      await expect(
        createTransferOrder({ ...baseArgs, originBranch: null })
      ).rejects.toThrow("No hay una sucursal origen activa.");
    });

    it("rechaza sin sucursal destino", async () => {
      await expect(
        createTransferOrder({ ...baseArgs, destinationBranch: null })
      ).rejects.toThrow("Selecciona la sucursal destino.");
    });

    it("rechaza sin usuario", async () => {
      await expect(
        createTransferOrder({ ...baseArgs, user: null })
      ).rejects.toThrow("No se detectó el usuario que genera el traspaso.");
    });

    it("rechaza sucursal origen igual a destino", async () => {
      await expect(
        createTransferOrder({
          ...baseArgs,
          destinationBranch: { id: "b1" },
        })
      ).rejects.toThrow("La sucursal destino debe ser distinta a la origen.");
    });

    it("envia el payload correcto al RPC create_transfer_order", async () => {
      await createTransferOrder(baseArgs);
      expect(supabase.rpc).toHaveBeenCalledWith("create_transfer_order", {
        p_from_branch_id: "b1",
        p_to_branch_id: "b2",
        p_user_id: "u1",
        p_notes: "Urgente",
        p_folio: "TR-010126-000000",
        p_items: [
          {
            productId: "p1",
            barcode: "—",
            name: "PRODUCTO SIN NOMBRE",
            requestedQty: 5,
            costPrice: 10,
            salePrice: 20,
          },
        ],
      });
    });

    it("lanza error si el RPC devuelve error", async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: "Stock insuficiente" },
      });
      await expect(createTransferOrder(baseArgs)).rejects.toThrow(
        "Stock insuficiente"
      );
    });

    it("lanza error si el RPC no devuelve transferId", async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: { success: false },
        error: null,
      });
      await expect(createTransferOrder(baseArgs)).rejects.toThrow(
        "La operación de creación no devolvió una referencia válida."
      );
    });
  });

  describe("receiveTransferOrder", () => {
    const baseArgs = {
      transferOrderId: "t1",
      receivedQuantities: { p1: 3 },
      currentBranch: { id: "b2" },
      user: { id: "u2", username: "recepcionista" },
    };

    beforeEach(() => {
      fetchTransferOrderById.mockResolvedValue({
        id: "t1",
        destinationBranchId: "b2",
        status: "pending_receipt",
        items: [{ productId: "p1", requestedQty: 5, name: "Croquetas" }],
      });
      supabase.rpc.mockResolvedValue({
        data: { success: true, transferId: "t1" },
        error: null,
      });
    });

    it("rechaza sin sucursal activa", async () => {
      await expect(
        receiveTransferOrder({ ...baseArgs, currentBranch: null })
      ).rejects.toThrow("No hay una sucursal activa para recibir el traspaso.");
    });

    it("rechaza si la orden no existe", async () => {
      fetchTransferOrderById.mockResolvedValueOnce(null);
      await expect(receiveTransferOrder(baseArgs)).rejects.toThrow(
        "No se encontró la orden de traspaso."
      );
    });

    it("rechaza si la orden no corresponde a la sucursal", async () => {
      fetchTransferOrderById.mockResolvedValueOnce({
        ...baseArgs,
        destinationBranchId: "b99",
        status: "pending_receipt",
        items: [],
      });
      await expect(receiveTransferOrder(baseArgs)).rejects.toThrow(
        "Esta orden no corresponde a la sucursal activa."
      );
    });

    it("rechaza si la orden ya fue recibida", async () => {
      fetchTransferOrderById.mockResolvedValueOnce({
        id: "t1",
        destinationBranchId: "b2",
        status: "received_complete",
        items: [],
      });
      await expect(receiveTransferOrder(baseArgs)).rejects.toThrow(
        "La orden seleccionada ya fue recibida."
      );
    });

    it("valida que la cantidad recibida no exceda la solicitada", async () => {
      await expect(
        receiveTransferOrder({
          ...baseArgs,
          receivedQuantities: { p1: 10 },
        })
      ).rejects.toThrow(
        "La recepción de Croquetas debe estar entre 0 y 5 piezas."
      );
    });

    it("envia el payload correcto al RPC receive_transfer_order", async () => {
      await receiveTransferOrder(baseArgs);
      expect(supabase.rpc).toHaveBeenCalledWith("receive_transfer_order", {
        p_transfer_id: "t1",
        p_destination_branch: "b2",
        p_user_id: "u2",
        p_username: "recepcionista",
        p_received_qty_map: { p1: 3 },
      });
    });
  });

  describe("cancelTransferOrder", () => {
    const baseArgs = {
      transferOrderId: "t1",
      currentBranch: { id: "b1" },
      user: { id: "u1", username: "admin" },
    };

    beforeEach(() => {
      fetchTransferOrderById.mockResolvedValue({
        id: "t1",
        originBranchId: "b1",
        status: "pending_receipt",
      });
      supabase.rpc.mockResolvedValue({
        data: { success: true, transferId: "t1" },
        error: null,
      });
    });

    it("rechaza sin sucursal activa", async () => {
      await expect(
        cancelTransferOrder({ ...baseArgs, currentBranch: null })
      ).rejects.toThrow(
        "No hay una sucursal activa para cancelar el traspaso."
      );
    });

    it("rechaza si la orden no existe", async () => {
      fetchTransferOrderById.mockResolvedValueOnce(null);
      await expect(cancelTransferOrder(baseArgs)).rejects.toThrow(
        "No se encontró la orden de traspaso."
      );
    });

    it("rechaza si la sucursal no es la origen", async () => {
      fetchTransferOrderById.mockResolvedValueOnce({
        id: "t1",
        originBranchId: "b99",
        status: "pending_receipt",
      });
      await expect(cancelTransferOrder(baseArgs)).rejects.toThrow(
        "Solo la sucursal origen puede cancelar este traspaso."
      );
    });

    it("rechaza si la orden no esta pendiente", async () => {
      fetchTransferOrderById.mockResolvedValueOnce({
        id: "t1",
        originBranchId: "b1",
        status: "received_complete",
      });
      await expect(cancelTransferOrder(baseArgs)).rejects.toThrow(
        "Solo se pueden cancelar órdenes pendientes de recepción."
      );
    });

    it("envia el payload correcto al RPC cancel_transfer_order", async () => {
      await cancelTransferOrder(baseArgs);
      expect(supabase.rpc).toHaveBeenCalledWith("cancel_transfer_order", {
        p_transfer_id: "t1",
        p_current_branch: "b1",
        p_user_id: "u1",
        p_username: "admin",
      });
    });
  });
});
