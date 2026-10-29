import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

const authState = vi.hoisted(() => ({
  user: { id: "u1" },
  cashRegistered: true,
}));

const branchState = vi.hoisted(() => ({ branch: { id: "b1" } }));

vi.mock("./AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("./BranchContext", () => ({
  useBranch: () => branchState,
}));

import { SalesCartProvider, useSalesCartContext } from "./SalesCartContext";
import { ModalStackProvider, useModalStack } from "./ModalStackContext";
import { SALE_CLIENT_EXPIRY_MS } from "../components/SalesComponents/services/salesClientExpiryService";

const wrapper = ({ children }) => (
  <SalesCartProvider>{children}</SalesCartProvider>
);

const renderCart = () => renderHook(() => useSalesCartContext(), { wrapper });

describe("SalesCartContext: persistencia de la venta", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    authState.user = { id: "u1" };
    authState.cashRegistered = true;
    branchState.branch = { id: "b1" };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("conserva productos y cliente fuera de la vista de ventas", () => {
    const { result } = renderCart();

    act(() => {
      result.current.setProductos([{ id: "p1", cantidad: 2 }]);
      result.current.setCurrentSaleClient({ id: "c1", name: "Ana" });
    });

    expect(result.current.productos).toHaveLength(1);
    expect(result.current.productosRef.current).toHaveLength(1);
    expect(result.current.currentSaleClient?.id).toBe("c1");
  });

  it("expira el cliente cinco minutos despues de asignarlo", () => {
    const { result } = renderCart();

    act(() => {
      result.current.setCurrentSaleClient({ id: "c1", name: "Ana" });
    });

    act(() => {
      vi.advanceTimersByTime(SALE_CLIENT_EXPIRY_MS - 1);
    });
    expect(result.current.currentSaleClient?.id).toBe("c1");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.currentSaleClient).toBeNull();
  });

  it("no reinicia el temporizador al reasignar el mismo cliente", () => {
    const { result } = renderCart();

    act(() => {
      result.current.setCurrentSaleClient({ id: "c1", name: "Ana" });
    });

    act(() => {
      vi.advanceTimersByTime(3 * 60 * 1000);
    });

    act(() => {
      result.current.setCurrentSaleClient({ id: "c1", name: "Ana" });
    });

    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(result.current.currentSaleClient).toBeNull();
  });

  it("limpia la asignacion al quitar el cliente manualmente", () => {
    const { result } = renderCart();

    act(() => {
      result.current.setCurrentSaleClient({ id: "c1", name: "Ana" });
    });

    act(() => {
      result.current.setCurrentSaleClient(null);
    });

    expect(result.current.currentSaleClient).toBeNull();
    expect(sessionStorage.getItem("sales_client_assignment_b1_u1")).toBeNull();
  });

  it.each([
    ["la sesion de caja", () => (authState.cashRegistered = false)],
    ["el usuario", () => (authState.user = { id: "u2" })],
    ["la sucursal", () => (branchState.branch = { id: "b2" })],
  ])("vacia la venta cuando cambia %s", (_label, changeIdentity) => {
    const { result, rerender } = renderCart();

    act(() => {
      result.current.setProductos([{ id: "p1", cantidad: 1 }]);
      result.current.setCurrentSaleClient({ id: "c1", name: "Ana" });
    });

    changeIdentity();
    rerender();

    expect(result.current.productos).toEqual([]);
    expect(result.current.currentSaleClient).toBeNull();
  });

  it("limpia las recompensas al expirar el cliente", () => {
    const { result } = renderCart();

    act(() => {
      result.current.setCurrentSaleClient({ id: "c1", name: "Ana" });
      result.current.setCurrentSaleReward({ id: "r1" });
      result.current.setPendingFreeProductRewards([{ id: "r2" }]);
      result.current.setPendingProductDiscountRewards([{ id: "r3" }]);
      result.current.setActiveProductDiscountReward({ id: "r4" });
    });

    act(() => {
      vi.advanceTimersByTime(SALE_CLIENT_EXPIRY_MS);
    });

    expect(result.current.currentSaleClient).toBeNull();
    expect(result.current.currentSaleReward).toBeNull();
    expect(result.current.pendingFreeProductRewards).toEqual([]);
    expect(result.current.pendingProductDiscountRewards).toEqual([]);
    expect(result.current.activeProductDiscountReward).toBeNull();
  });

  describe("con un modal abierto", () => {
    const stackWrapper = ({ children }) => (
      <ModalStackProvider>
        <SalesCartProvider>{children}</SalesCartProvider>
      </ModalStackProvider>
    );

    const renderWithStack = () =>
      renderHook(
        () => ({ cart: useSalesCartContext(), stack: useModalStack() }),
        { wrapper: stackWrapper }
      );

    it("congela el plazo restante mientras el cobro esta abierto", () => {
      const { result } = renderWithStack();

      act(() => {
        result.current.cart.setCurrentSaleClient({ id: "c1", name: "Ana" });
      });

      act(() => {
        vi.advanceTimersByTime(SALE_CLIENT_EXPIRY_MS - 5000);
      });

      let unregister;
      act(() => {
        unregister = result.current.stack.registerLayer("sales-payment");
      });

      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });
      expect(result.current.cart.currentSaleClient?.id).toBe("c1");

      act(() => {
        unregister();
      });
      expect(result.current.cart.currentSaleClient?.id).toBe("c1");

      act(() => {
        vi.advanceTimersByTime(4999);
      });
      expect(result.current.cart.currentSaleClient?.id).toBe("c1");

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.cart.currentSaleClient).toBeNull();
    });

    it("no pierde el cliente al cancelar un cobro que duro mas de cinco minutos", () => {
      const { result } = renderWithStack();

      act(() => {
        result.current.cart.setCurrentSaleClient({ id: "c1", name: "Ana" });
      });

      let unregister;
      act(() => {
        unregister = result.current.stack.registerLayer("sales-payment");
      });

      act(() => {
        vi.advanceTimersByTime(SALE_CLIENT_EXPIRY_MS * 2);
      });

      act(() => {
        unregister();
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.cart.currentSaleClient?.id).toBe("c1");

      act(() => {
        vi.advanceTimersByTime(SALE_CLIENT_EXPIRY_MS - 1000);
      });
      expect(result.current.cart.currentSaleClient).toBeNull();
    });
  });
});
