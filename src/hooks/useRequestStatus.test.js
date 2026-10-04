import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useRequestStatus } from "./useRequestStatus";

describe("useRequestStatus", () => {
  it("arranca en carga cuando nada se ha resuelto todavia", () => {
    const { result } = renderHook(() => useRequestStatus("k1"));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isStale).toBe(true);
    expect(result.current.settledKey).toBeNull();
  });

  it("deja de estar en carga cuando la clave pedida queda resuelta", () => {
    const { result } = renderHook(() => useRequestStatus("k1"));

    act(() => {
      result.current.markSettled();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.settledKey).toBe("k1");
  });

  it("vuelve a estar en carga cuando cambia la clave pedida", () => {
    const { result, rerender } = renderHook(
      ({ key }) => useRequestStatus(key),
      {
        initialProps: { key: "k1" },
      }
    );

    act(() => {
      result.current.markSettled();
    });
    expect(result.current.isLoading).toBe(false);

    rerender({ key: "k2" });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isStale).toBe(true);
  });

  it("ignora la resolucion de una peticion que ya no es la vigente", () => {
    const { result, rerender } = renderHook(
      ({ key }) => useRequestStatus(key),
      {
        initialProps: { key: "k1" },
      }
    );

    // Se captura el setter de la peticion antigua antes de cambiar la clave.
    const settleOldRequest = result.current.markSettled;

    rerender({ key: "k2" });

    act(() => {
      settleOldRequest();
    });

    // La clave resuelta es la antigua, asi que la nueva sigue en carga.
    expect(result.current.settledKey).toBe("k1");
    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.markSettled();
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("no dispara setState durante el render al cambiar la clave", () => {
    let renders = 0;

    const { rerender } = renderHook(
      ({ key }) => {
        renders += 1;
        return useRequestStatus(key).isLoading;
      },
      { initialProps: { key: "k1" } }
    );

    expect(renders).toBe(1);

    rerender({ key: "k2" });

    // Un solo render: la carga se deriva, no se provoca con un setState.
    expect(renders).toBe(2);
  });
});
