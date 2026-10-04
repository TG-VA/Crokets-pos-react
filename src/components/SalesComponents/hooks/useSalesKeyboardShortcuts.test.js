import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import useSalesKeyboardShortcuts from "./useSalesKeyboardShortcuts";

const createProps = (overrides = {}) => ({
  productos: [
    { id: "P1", nombre: "Producto 1" },
    { id: "P2", nombre: "Producto 2" },
  ],
  selectedProduct: null,
  setSelectedProduct: vi.fn(),
  processingSale: false,
  shiftAlreadyCut: false,
  showPaymentModal: false,
  isEntryModalOpen: false,
  isExitModalOpen: false,
  isExitAuthModalOpen: false,
  isClientModalOpen: false,
  isRewardProductModalOpen: false,
  isProductDiscountRewardModalOpen: false,
  isVerifierModalOpen: false,
  isSearchModalOpen: false,
  isDiscountModalOpen: false,
  isPendingModalOpen: false,
  isChangeModalOpen: false,
  isDeleteModalOpen: false,
  isDeleteItemModalOpen: false,
  isSalesHistoryModalOpen: false,
  saleSuccessData: null,
  setShowPaymentModal: vi.fn(),
  setEntryModalOpen: vi.fn(),
  setExitModalOpen: vi.fn(),
  setExitAuthModalOpen: vi.fn(),
  setClientModalOpen: vi.fn(),
  setVerifierModalOpen: vi.fn(),
  setSearchModalOpen: vi.fn(),
  setDiscountModalOpen: vi.fn(),
  setPendingModalOpen: vi.fn(),
  setChangeModalOpen: vi.fn(),
  setDeleteModalOpen: vi.fn(),
  setDeleteItemModalOpen: vi.fn(),
  setSalesHistoryModalOpen: vi.fn(),
  setSaleSuccessData: vi.fn(),
  openPaymentFlow: vi.fn(),
  handleOpenChangeModal: vi.fn(),
  handleOpenDeleteModal: vi.fn(),
  handleOpenDiscountModal: vi.fn(),
  handleCloseRewardProductModal: vi.fn(),
  handleCloseProductDiscountRewardModal: vi.fn(),
  increaseSelectedProductQuantity: vi.fn(),
  decreaseSelectedProductQuantity: vi.fn(),
  openExitFlow: vi.fn(),
  showAppWarning: vi.fn(),
  ...overrides,
});

const keydownListeners = (spy) =>
  spy.mock.calls
    .filter(([eventType]) => eventType === "keydown")
    .map(([, fn]) => fn);

const dispatchKey = (key, init = {}) => {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  act(() => {
    document.dispatchEvent(event);
  });
  return event;
};

describe("useSalesKeyboardShortcuts", () => {
  let addSpy;
  let removeSpy;

  beforeEach(() => {
    addSpy = vi.spyOn(document, "addEventListener");
    removeSpy = vi.spyOn(document, "removeEventListener");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registra el listener de teclado una sola vez en fase de captura", () => {
    renderHook(() => useSalesKeyboardShortcuts(createProps()));

    const keydownCalls = addSpy.mock.calls.filter(
      ([eventType]) => eventType === "keydown"
    );

    expect(keydownCalls).toHaveLength(1);
    expect(keydownCalls[0][2]).toEqual({ capture: true });
  });

  it("no vuelve a registrar el listener aunque cambien las props", () => {
    const { rerender } = renderHook(
      (props) => useSalesKeyboardShortcuts(props),
      {
        initialProps: createProps(),
      }
    );

    const firstListener = keydownListeners(addSpy)[0];

    rerender(createProps({ isSearchModalOpen: true, processingSale: true }));
    rerender(createProps({ saleSuccessData: { folio: "F-1" } }));

    expect(keydownListeners(addSpy)).toHaveLength(1);
    expect(keydownListeners(addSpy)[0]).toBe(firstListener);
  });

  it("lee las props mas recientes a traves de la referencia sincronizada", () => {
    const stalePendingSpy = vi.fn();
    const latestPendingSpy = vi.fn();

    const { rerender } = renderHook(
      (props) => useSalesKeyboardShortcuts(props),
      {
        initialProps: createProps({ setPendingModalOpen: stalePendingSpy }),
      }
    );

    rerender(createProps({ setPendingModalOpen: latestPendingSpy }));

    dispatchKey("F6");

    expect(latestPendingSpy).toHaveBeenCalledWith(true);
    expect(stalePendingSpy).not.toHaveBeenCalled();
  });

  it("omite el atajo de F7 cuando el turno ya fue cortado", () => {
    const { rerender } = renderHook(
      (props) => useSalesKeyboardShortcuts(props),
      {
        initialProps: createProps({ setEntryModalOpen: vi.fn() }),
      }
    );

    const entrySpy = vi.fn();
    const warnSpy = vi.fn();

    rerender(
      createProps({
        shiftAlreadyCut: true,
        setEntryModalOpen: entrySpy,
        showAppWarning: warnSpy,
      })
    );

    dispatchKey("F7");

    expect(entrySpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("omite los atajos de navegacion cuando hay un modal abierto", () => {
    const selectedSpy = vi.fn();

    const { rerender } = renderHook(
      (props) => useSalesKeyboardShortcuts(props),
      {
        initialProps: createProps({ setSelectedProduct: selectedSpy }),
      }
    );

    rerender(
      createProps({ isSearchModalOpen: true, setSelectedProduct: selectedSpy })
    );

    dispatchKey("ArrowDown");

    expect(selectedSpy).not.toHaveBeenCalled();
  });

  it("navega entre productos con las flechas cuando no hay modal abierto", () => {
    const selectedSpy = vi.fn();

    renderHook(() =>
      useSalesKeyboardShortcuts(
        createProps({ setSelectedProduct: selectedSpy })
      )
    );

    dispatchKey("ArrowDown");

    expect(selectedSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: "P1" })
    );
  });

  it("ignora las flechas cuando el foco esta en un input, salvo Escape", () => {
    const selectedSpy = vi.fn();
    const closeSpy = vi.fn();

    renderHook(() =>
      useSalesKeyboardShortcuts(
        createProps({
          setSelectedProduct: selectedSpy,
          isSearchModalOpen: true,
          setSearchModalOpen: closeSpy,
        })
      )
    );

    const input = document.createElement("input");
    document.body.appendChild(input);

    const arrowEvent = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      input.dispatchEvent(arrowEvent);
    });
    expect(selectedSpy).not.toHaveBeenCalled();

    const escapeEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      input.dispatchEvent(escapeEvent);
    });
    expect(closeSpy).toHaveBeenCalledWith(false);

    document.body.removeChild(input);
  });

  it("retira el listener de teclado al desmontar usando la misma funcion", () => {
    const { unmount } = renderHook(() =>
      useSalesKeyboardShortcuts(createProps())
    );

    const registered = keydownListeners(addSpy)[0];
    expect(removeSpy).not.toHaveBeenCalledWith("keydown", registered, {
      capture: true,
    });

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("keydown", registered, {
      capture: true,
    });
  });
});
