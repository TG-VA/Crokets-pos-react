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
      {
        productId: "p1",
        productName: "Croqueta",
        expectedQty: 5,
        costPrice: 120,
      },
      {
        productId: "p2",
        productName: "Shampoo",
        expectedQty: 2,
        costPrice: 45.5,
      },
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

describe("useReceiveOrderForm costo de recepcion", () => {
  beforeEach(() => {
    mocks.receiveStoreOrder.mockReset();
  });

  it("precarga el costo congelado del pedido al seleccionarlo", () => {
    const { result } = setup();

    selectFirst(result);

    expect(result.current.costs).toEqual({ p1: "120.00", p2: "45.50" });
  });

  it("exige capturar el costo cuando el pedido trae costo 0", () => {
    const zeroCostOrder = {
      ...orders[0],
      items: [{ ...orders[0].items[0], costPrice: 0 }],
    };
    const { result } = setup({ orders: [zeroCostOrder] });

    act(() => {
      result.current.selectOrder(zeroCostOrder);
    });
    capture(result, { p1: "5" });

    expect(result.current.costs).toEqual({ p1: "" });
    expect(result.current.missingCostItems).toHaveLength(1);
    expect(result.current.canSubmit).toBe(false);
  });

  it("ignora capturas de costo invalidas y conserva el valor previo", () => {
    const { result } = setup();

    selectFirst(result);
    act(() => {
      result.current.setCost("p1", "-5");
    });
    act(() => {
      result.current.setCost("p1", "1.234");
    });

    expect(result.current.costs.p1).toBe("120.00");

    act(() => {
      result.current.setCost("p1", "98,5");
    });

    expect(result.current.costs.p1).toBe("98.5");
  });

  it("ignora un costo mayor al tope en vez de reportarlo como faltante", () => {
    const { result } = setup();

    selectFirst(result);
    act(() => {
      result.current.setCost("p1", "2000000");
    });

    expect(result.current.costs.p1).toBe("120.00");
    expect(result.current.missingCostItems).toHaveLength(0);
  });

  it("bloquea el envio si falta el costo de una partida recibida", async () => {
    const { result } = setup();

    selectFirst(result);
    capture(result, { p1: "5", p2: "2" });
    act(() => {
      result.current.setCost("p2", "");
    });

    expect(result.current.missingCostItems).toHaveLength(1);
    expect(result.current.canSubmit).toBe(false);

    await act(async () => {
      await result.current.submitReceipt();
    });

    expect(mocks.receiveStoreOrder).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/costo/);
  });

  it("no exige costo a una partida recibida en 0", () => {
    const { result } = setup();

    selectFirst(result);
    capture(result, { p1: "5", p2: "0" });
    act(() => {
      result.current.setCost("p2", "");
    });

    expect(result.current.missingCostItems).toHaveLength(0);
  });

  it("envia los costos capturados al servicio", async () => {
    mocks.receiveStoreOrder.mockResolvedValue({ id: "o1" });
    const { result } = setup();

    selectFirst(result);
    capture(result, { p1: "5", p2: "2" });
    act(() => {
      result.current.setCost("p1", "110");
    });

    await act(async () => {
      await result.current.submitReceipt();
    });

    expect(mocks.receiveStoreOrder).toHaveBeenCalledWith(
      expect.objectContaining({ costs: { p1: "110", p2: "45.50" } })
    );
  });
});
