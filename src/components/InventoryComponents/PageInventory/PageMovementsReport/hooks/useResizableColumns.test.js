import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import useResizableColumns from "./useResizableColumns";

const STORAGE_KEY = "movementsReportColWidths_v6";

const mouseDown = (clientX) => ({
  clientX,
  preventDefault: () => {},
  stopPropagation: () => {},
});

describe("useResizableColumns", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("lee anchos de una clave heredada y respeta el minimo", () => {
    window.localStorage.setItem(
      "movementsReportColWidths_v5",
      JSON.stringify({ product: 10, ticket: 200 })
    );

    const { result } = renderHook(() => useResizableColumns());

    expect(result.current.columnWidths.product).toBe(160);
    expect(result.current.columnWidths.ticket).toBe(200);
  });

  it("redimensiona con el mouse, guarda y suelta los listeners", () => {
    const { result } = renderHook(() => useResizableColumns());

    act(() => result.current.startResize("ticket", 60, mouseDown(100)));
    expect(result.current.isResizing).toBe(true);

    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 150 }));
    });
    expect(result.current.columnWidths.ticket).toBe(170);

    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 500 }));
    });
    expect(result.current.isResizing).toBe(false);
    expect(result.current.columnWidths.ticket).toBe(170);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)).ticket).toBe(
      170
    );
  });

  it("no baja del minimo de la columna", () => {
    const { result } = renderHook(() => useResizableColumns());

    act(() => result.current.startResize("ticket", 60, mouseDown(500)));
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 0 }));
      window.dispatchEvent(new MouseEvent("mouseup"));
    });

    expect(result.current.columnWidths.ticket).toBe(90);
  });
});
