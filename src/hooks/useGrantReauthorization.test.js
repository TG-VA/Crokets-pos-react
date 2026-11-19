import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import useGrantReauthorization from "./useGrantReauthorization";

describe("useGrantReauthorization", () => {
  it("abre y cierra el modal sin reintentar", () => {
    const { result } = renderHook(() => useGrantReauthorization());

    act(() => result.current.requestReauthorization());
    expect(result.current.reauthorizationOpen).toBe(true);

    act(() => result.current.closeReauthorization());
    expect(result.current.reauthorizationOpen).toBe(false);
  });

  it("al confirmar cierra el modal y reintenta una sola vez", () => {
    const retry = vi.fn();
    const { result } = renderHook(() => useGrantReauthorization());

    act(() => result.current.requestReauthorization());
    act(() => result.current.confirmReauthorization(retry));

    expect(result.current.reauthorizationOpen).toBe(false);
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
