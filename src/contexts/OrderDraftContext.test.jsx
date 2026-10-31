import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { vi } from "vitest";

const authState = vi.hoisted(() => ({ user: { id: "u1" } }));
const branchState = vi.hoisted(() => ({ branch: { id: "b1" } }));

vi.mock("./AuthContext", () => ({ useAuth: () => authState }));
vi.mock("./BranchContext", () => ({ useBranch: () => branchState }));

import { OrderDraftProvider, useOrderDraft } from "./OrderDraftContext";

const wrapper = ({ children }) => (
  <OrderDraftProvider>{children}</OrderDraftProvider>
);

describe("OrderDraftContext", () => {
  beforeEach(() => {
    authState.user = { id: "u1" };
    branchState.branch = { id: "b1" };
  });

  it("conserva el borrador al desmontar el consumidor", () => {
    const { result, rerender } = renderHook(() => useOrderDraft(), {
      wrapper,
    });

    act(() => {
      result.current.setOrderName("PEDIDO A");
      result.current.setItems([{ productId: "p1", expectedQty: "2" }]);
    });

    rerender();

    expect(result.current.orderName).toBe("PEDIDO A");
    expect(result.current.items).toHaveLength(1);
  });

  it("clearDraft vacia todos los campos", () => {
    const { result } = renderHook(() => useOrderDraft(), { wrapper });

    act(() => {
      result.current.setOrderName("X");
      result.current.setDestinationBranchId("b2");
      result.current.setNotes("n");
      result.current.setItems([{ productId: "p1" }]);
    });
    act(() => result.current.clearDraft());

    expect(result.current.orderName).toBe("");
    expect(result.current.destinationBranchId).toBe("");
    expect(result.current.notes).toBe("");
    expect(result.current.items).toEqual([]);
  });

  it("descarta el borrador al cambiar de sucursal o de usuario", () => {
    const { result, rerender } = renderHook(() => useOrderDraft(), {
      wrapper,
    });

    act(() => result.current.setOrderName("X"));
    branchState.branch = { id: "b2" };
    rerender();
    expect(result.current.orderName).toBe("");

    act(() => result.current.setOrderName("Y"));
    authState.user = null;
    rerender();
    expect(result.current.orderName).toBe("");
  });

  it("nunca expone el borrador anterior en el render tras cambiar de sucursal", () => {
    const seen = [];
    const { result, rerender } = renderHook(
      () => {
        const draft = useOrderDraft();
        seen.push(draft.orderName);
        return draft;
      },
      { wrapper }
    );

    act(() => result.current.setOrderName("X"));
    seen.length = 0;

    branchState.branch = { id: "b2" };
    rerender();

    expect(seen.length).toBeGreaterThan(0);
    expect(seen).not.toContain("X");
  });
});
