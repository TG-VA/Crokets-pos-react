import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppModal } from "./useAppModal";

describe("useAppModal children", () => {
  it("inicia sin children", () => {
    const { result } = renderHook(() => useAppModal());

    expect(result.current.appModal.children).toBeNull();
  });

  it("showAppAlert conserva children y closeAppModal los limpia", () => {
    const { result } = renderHook(() => useAppModal());
    const node = { type: "span", props: {} };

    act(() => result.current.showAppAlert({ title: "Aviso", children: node }));

    expect(result.current.appModal.isOpen).toBe(true);
    expect(result.current.appModal.children).toBe(node);

    act(() => result.current.closeAppModal());

    expect(result.current.appModal.isOpen).toBe(false);
    expect(result.current.appModal.children).toBeNull();
  });

  it("showAppConfirm no arrastra children previos", () => {
    const { result } = renderHook(() => useAppModal());

    act(() =>
      result.current.showAppAlert({ children: { type: "span", props: {} } })
    );
    act(() => result.current.showAppConfirm({ onConfirm: vi.fn() }));

    expect(result.current.appModal.children).toBeNull();
  });
});
