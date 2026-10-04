import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import useSalesTableColumns from "./useSalesTableColumns";

const createMouseDownEvent = (clientX) => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  clientX,
});

const listenersOfType = (spy, type) =>
  spy.mock.calls
    .filter(([eventType]) => eventType === type)
    .map(([, fn]) => fn);

describe("useSalesTableColumns", () => {
  let addSpy;
  let removeSpy;

  beforeEach(() => {
    addSpy = vi.spyOn(document, "addEventListener");
    removeSpy = vi.spyOn(document, "removeEventListener");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });

  it("registra los listeners de arrastre al iniciar el redimensionado", () => {
    const { result } = renderHook(() => useSalesTableColumns());

    act(() => {
      result.current.handleMouseDown(createMouseDownEvent(300), 0);
    });

    expect(listenersOfType(addSpy, "mousemove")).toHaveLength(1);
    expect(listenersOfType(addSpy, "mouseup")).toHaveLength(1);
    expect(document.body.style.cursor).toBe("col-resize");
    expect(document.body.style.userSelect).toBe("none");
  });

  it("redimensiona la columna actual y la siguiente mientras se arrastra", () => {
    const { result } = renderHook(() => useSalesTableColumns());

    act(() => {
      result.current.handleMouseDown(createMouseDownEvent(300), 0);
    });
    act(() => {
      document.dispatchEvent(new MouseEvent("mousemove", { clientX: 350 }));
    });

    expect(result.current.columnWidths[0]).toBe(450);
    expect(result.current.columnWidths[1]).toBe(100);

    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup"));
    });

    act(() => {
      document.dispatchEvent(new MouseEvent("mousemove", { clientX: 500 }));
    });

    expect(result.current.columnWidths[0]).toBe(450);
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");
  });

  it("elimina en el mouseup exactamente los listeners que registró el mousedown", () => {
    const { result } = renderHook(() => useSalesTableColumns());

    act(() => {
      result.current.handleMouseDown(createMouseDownEvent(300), 0);
    });

    const addedMouseMove = listenersOfType(addSpy, "mousemove");
    const addedMouseUp = listenersOfType(addSpy, "mouseup");

    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup"));
    });

    expect(listenersOfType(removeSpy, "mousemove")).toEqual(addedMouseMove);
    expect(listenersOfType(removeSpy, "mouseup")).toEqual(addedMouseUp);
  });

  it("respeta el ancho minimo al arrastrar mas alla del limite", () => {
    const { result } = renderHook(() =>
      useSalesTableColumns({ minColumnWidth: 200 })
    );

    act(() => {
      result.current.handleMouseDown(createMouseDownEvent(300), 0);
    });
    act(() => {
      document.dispatchEvent(new MouseEvent("mousemove", { clientX: 100 }));
    });

    expect(result.current.columnWidths[0]).toBe(200);
    expect(result.current.columnWidths[1]).toBe(350);

    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup"));
    });
  });

  it("no registra listeners al redimensionar la ultima columna", () => {
    const { result } = renderHook(() => useSalesTableColumns());

    const lastIndex = result.current.columnWidths.length - 1;

    act(() => {
      result.current.handleMouseDown(createMouseDownEvent(300), lastIndex);
    });

    expect(listenersOfType(addSpy, "mousemove")).toHaveLength(0);
    expect(listenersOfType(addSpy, "mouseup")).toHaveLength(0);
    expect(document.body.style.cursor).toBe("");
  });

  it("retira los listeners y restaura el cursor al desmontar durante un arrastre", () => {
    const { result, unmount } = renderHook(() => useSalesTableColumns());

    act(() => {
      result.current.handleMouseDown(createMouseDownEvent(300), 0);
    });

    const addedMouseMove = listenersOfType(addSpy, "mousemove");
    const addedMouseUp = listenersOfType(addSpy, "mouseup");
    const removalsBeforeUnmount = removeSpy.mock.calls.length;

    unmount();

    expect(removeSpy.mock.calls.length).toBeGreaterThan(removalsBeforeUnmount);
    expect(listenersOfType(removeSpy, "mousemove")).toEqual(
      expect.arrayContaining(addedMouseMove)
    );
    expect(listenersOfType(removeSpy, "mouseup")).toEqual(
      expect.arrayContaining(addedMouseUp)
    );
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");
  });
});
