import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../services/transfersService", () => ({
  receiveTransferOrder: vi.fn(),
}));

import { receiveTransferOrder } from "../services/transfersService";
import useReceiveForm from "./useReceiveForm";

const pendingOrders = [
  {
    id: "t1",
    folio: "TR-010126-000001",
    status: "pending_receipt",
    originBranchName: "Origen",
    items: [
      { productId: "p1", name: "Croquetas", requestedQty: 10 },
      { productId: "p2", name: "Shampoo", requestedQty: 5 },
    ],
  },
];

const createProps = (overrides = {}) => ({
  branch: { id: "b2", name: "Destino" },
  user: { id: "u2", username: "recepcionista" },
  refreshProducts: vi.fn().mockResolvedValue(),
  reloadOrders: vi.fn().mockResolvedValue(),
  setActiveTab: vi.fn(),
  pendingReceiptOrders: pendingOrders,
  submitting: false,
  setSubmitting: vi.fn(),
  clearFeedback: vi.fn(),
  setError: vi.fn(),
  setSuccess: vi.fn(),
  ...overrides,
});

describe("useReceiveForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("selecciona la primera orden pendiente por defecto", () => {
    const { result } = renderHook(() => useReceiveForm(createProps()));
    expect(result.current.selectedReceiptOrderId).toBe("t1");
  });

  it("resetea la seleccion si no hay ordenes pendientes", () => {
    const { result } = renderHook(() =>
      useReceiveForm(createProps({ pendingReceiptOrders: [] }))
    );
    expect(result.current.selectedReceiptOrderId).toBe("");
    expect(result.current.selectedReceiptOrder).toBeNull();
  });

  it("inicializa receiptQuantities en 0 para cada producto", () => {
    const { result } = renderHook(() => useReceiveForm(createProps()));
    expect(result.current.receiptQuantities).toEqual({ p1: "0", p2: "0" });
  });

  it("handleReceiptQuantityChange actualiza la cantidad", () => {
    const { result } = renderHook(() => useReceiveForm(createProps()));
    act(() => {
      result.current.handleReceiptQuantityChange("p1", "7");
    });
    expect(result.current.receiptQuantities.p1).toBe("7");
  });

  it("handleSelectReceiptOrder cambia la orden seleccionada", () => {
    const { result } = renderHook(() => useReceiveForm(createProps()));
    act(() => {
      result.current.handleSelectReceiptOrder("t1");
    });
    expect(result.current.selectedReceiptOrderId).toBe("t1");
  });

  it("handleConfirmReceipt: error si no hay orden seleccionada", async () => {
    const setError = vi.fn();
    const { result } = renderHook(() =>
      useReceiveForm(createProps({ setError, pendingReceiptOrders: [] }))
    );
    await act(async () => {
      await result.current.handleConfirmReceipt();
    });
    expect(setError).toHaveBeenCalledWith(
      "Selecciona una orden pendiente para recibir."
    );
  });

  it("handleConfirmReceipt: recibe completo y muestra success", async () => {
    receiveTransferOrder.mockResolvedValueOnce({
      id: "t1",
      folio: "TR-010126-000001",
      status: "received_complete",
    });
    const setSuccess = vi.fn();
    const { result } = renderHook(() =>
      useReceiveForm(createProps({ setSuccess }))
    );
    await act(async () => {
      await result.current.handleConfirmReceipt();
    });
    expect(receiveTransferOrder).toHaveBeenCalledWith({
      transferOrderId: "t1",
      receivedQuantities: { p1: "0", p2: "0" },
      currentBranch: { id: "b2", name: "Destino" },
      user: { id: "u2", username: "recepcionista" },
    });
    expect(setSuccess).toHaveBeenCalledWith(
      "Se recibió completo el traspaso TR-010126-000001."
    );
  });

  it("handleConfirmReceipt: muestra mensaje de diferencia si aplica", async () => {
    receiveTransferOrder.mockResolvedValueOnce({
      id: "t1",
      folio: "TR-010126-000001",
      status: "received_with_difference",
      originBranchName: "Origen",
    });
    const setSuccess = vi.fn();
    const { result } = renderHook(() =>
      useReceiveForm(createProps({ setSuccess }))
    );
    await act(async () => {
      await result.current.handleConfirmReceipt();
    });
    expect(setSuccess).toHaveBeenCalledWith(
      "Se recibió TR-010126-000001 con diferencias y el faltante regresó automáticamente a Origen."
    );
  });

  it("handleConfirmReceipt: error si el RPC falla", async () => {
    receiveTransferOrder.mockRejectedValueOnce(new Error("Cantidad invalida"));
    const setError = vi.fn();
    const { result } = renderHook(() =>
      useReceiveForm(createProps({ setError }))
    );
    await act(async () => {
      await result.current.handleConfirmReceipt();
    });
    expect(setError).toHaveBeenCalledWith("Cantidad invalida");
  });
});
