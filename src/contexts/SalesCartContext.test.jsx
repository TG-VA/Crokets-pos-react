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

  it("vacia la venta cuando cambia la sesion de caja", () => {
    const { result, rerender } = renderCart();

    act(() => {
      result.current.setProductos([{ id: "p1", cantidad: 1 }]);
      result.current.setCurrentSaleClient({ id: "c1", name: "Ana" });
    });

    authState.cashRegistered = false;
    rerender();

    expect(result.current.productos).toEqual([]);
    expect(result.current.currentSaleClient).toBeNull();
  });
});
