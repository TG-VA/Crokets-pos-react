import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  user: { id: "u1" },
  receiveStoreOrder: vi.fn(),
}));

vi.mock("../../../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user }),
}));
vi.mock("../services/ordersService", () => ({
  receiveStoreOrder: mocks.receiveStoreOrder,
}));

import { useReceiveOrderForm } from "./useReceiveOrderForm";

const orders = [
  {
    id: "o1",
    status: "pending",
    toBranchId: "b1",
    items: [
      { productId: "p1", productName: "Croqueta", expectedQty: 5 },
      { productId: "p2", productName: "Shampoo", expectedQty: 2 },
    ],
  },
];

const setup = (props = {}) =>
  renderHook(() =>
    useReceiveOrderForm({ orders, currentBranchId: "b1", ...props })
  );

const selectFirst = (result) =>
  act(() => {
    result.current.selectOrder(orders[0]);
  });

const capture = (result, quantities) =>
  act(() => {
    Object.entries(quantities).forEach(([productId, value]) => {
      result.current.setQuantity(productId, value);
    });
  });

describe("useReceiveOrderForm nota y envio", () => {
  beforeEach(() => {
    mocks.receiveStoreOrder.mockReset();
  });

  it("no permite enviar mientras falten partidas por capturar", () => {
    const { result } = setup();

    selectFirst(result);
    capture(result, { p1: "5" });

    expect(result.current.isComplete).toBe(false);
    expect(result.current.canSubmit).toBe(false);
  });

  it("permite enviar sin nota cuando el conteo coincide", () => {
    const { result } = setup();

    selectFirst(result);
    capture(result, { p1: "5", p2: "2" });

    expect(result.current.isNoteRequired).toBe(false);
    expect(result.current.noteError).toBe("");
    expect(result.current.canSubmit).toBe(true);
  });

  it("exige nota con diferencias y la habilita al escribirla", () => {
    const { result } = setup();

    selectFirst(result);
    capture(result, { p1: "4", p2: "2" });

    expect(result.current.isNoteRequired).toBe(true);
    expect(result.current.noteError).toMatch(/obligatoria/);
    expect(result.current.canSubmit).toBe(false);

    act(() => {
      result.current.setReceiptNote("Faltó una bolsa");
    });

    expect(result.current.noteError).toBe("");
    expect(result.current.canSubmit).toBe(true);
  });

  it("no llama al servicio si la nota obligatoria falta y muestra el error", async () => {
    const { result } = setup();

    selectFirst(result);
    capture(result, { p1: "4", p2: "2" });

    await act(async () => {
      await result.current.submitReceipt();
    });

    expect(mocks.receiveStoreOrder).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/obligatoria/);
  });

  it("envia la nota al servicio y limpia la seleccion al recibir", async () => {
    const received = { id: "o1", status: "accepted_with_difference" };
    const onReceived = vi.fn();

    mocks.receiveStoreOrder.mockResolvedValue(received);

    const { result } = setup({ onReceived });

    selectFirst(result);
    capture(result, { p1: "4", p2: "2" });
    act(() => {
      result.current.setReceiptNote("Faltó una bolsa");
    });

    await act(async () => {
      await result.current.submitReceipt();
    });

    expect(mocks.receiveStoreOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        receiptNote: "Faltó una bolsa",
        currentBranchId: "b1",
      })
    );
    expect(onReceived).toHaveBeenCalledWith(received);
    expect(result.current.selectedOrder).toBeNull();
    expect(result.current.receiptNote).toBe("");
  });

  it("conserva la seleccion y expone el error si el servicio falla", async () => {
    mocks.receiveStoreOrder.mockRejectedValue(new Error("Fallo de red"));

    const { result } = setup();

    selectFirst(result);
    capture(result, { p1: "5", p2: "2" });

    await act(async () => {
      await result.current.submitReceipt();
    });

    expect(result.current.error).toBe("Fallo de red");
    expect(result.current.selectedOrder).not.toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });
});
