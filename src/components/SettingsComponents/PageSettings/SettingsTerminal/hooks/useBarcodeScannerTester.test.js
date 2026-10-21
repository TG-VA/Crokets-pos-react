import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBarcodeScannerTester } from "./useBarcodeScannerTester";

describe("useBarcodeScannerTester", () => {
  it("inicia con valores por defecto vacios", () => {
    const { result } = renderHook(() => useBarcodeScannerTester());

    expect(result.current.testInput).toBe("");
    expect(result.current.lastScanResult).toBeNull();
    expect(result.current.recentScans).toEqual([]);
  });

  it("actualiza el valor de entrada con handleInputChange", () => {
    const { result } = renderHook(() => useBarcodeScannerTester());

    act(() => {
      result.current.handleInputChange({ target: { value: "750100" } });
    });

    expect(result.current.testInput).toBe("750100");
  });

  it("procesa escaneo con sufijo Enter al presionar Enter", () => {
    const { result } = renderHook(() => useBarcodeScannerTester());

    act(() => {
      result.current.handleInputChange({ target: { value: "750123456789" } });
    });

    const preventDefault = vi.fn();
    act(() => {
      result.current.handleKeyDown({ key: "Enter", preventDefault });
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.testInput).toBe("");
    expect(result.current.lastScanResult).not.toBeNull();
    expect(result.current.lastScanResult.code).toBe("750123456789");
    expect(result.current.lastScanResult.hasEnterSuffix).toBe(true);
    expect(result.current.lastScanResult.suffixName).toBe("Enter");
    expect(result.current.recentScans).toHaveLength(1);
  });

  it("procesa escaneo con sufijo Tab detectando que no tiene Enter", () => {
    const { result } = renderHook(() => useBarcodeScannerTester());

    act(() => {
      result.current.handleInputChange({ target: { value: "ABC-123" } });
    });

    const preventDefault = vi.fn();
    act(() => {
      result.current.handleKeyDown({ key: "Tab", preventDefault });
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.lastScanResult.hasEnterSuffix).toBe(false);
    expect(result.current.lastScanResult.suffixName).toBe("Tab");
    expect(result.current.recentScans).toHaveLength(1);
  });

  it("procesa escaneo manual sin Enter a traves de handleManualSubmit", () => {
    const { result } = renderHook(() => useBarcodeScannerTester());

    act(() => {
      result.current.handleInputChange({ target: { value: "987654" } });
    });

    act(() => {
      result.current.handleManualSubmit();
    });

    expect(result.current.testInput).toBe("");
    expect(result.current.lastScanResult.code).toBe("987654");
    expect(result.current.lastScanResult.hasEnterSuffix).toBe(false);
    expect(result.current.lastScanResult.suffixName).toBe("Manual (sin Enter)");
  });

  it("no procesa cuando el input esta vacio o solo contiene espacios", () => {
    const { result } = renderHook(() => useBarcodeScannerTester());

    act(() => {
      result.current.handleInputChange({ target: { value: "   " } });
    });

    const preventDefault = vi.fn();
    act(() => {
      result.current.handleKeyDown({ key: "Enter", preventDefault });
    });

    expect(result.current.lastScanResult).toBeNull();
    expect(result.current.recentScans).toEqual([]);
  });

  it("limpia el historial y el ultimo escaneo con handleClearHistory", () => {
    const { result } = renderHook(() => useBarcodeScannerTester());

    act(() => {
      result.current.handleInputChange({ target: { value: "CODE1" } });
    });
    act(() => {
      result.current.handleKeyDown({ key: "Enter", preventDefault: vi.fn() });
    });

    expect(result.current.recentScans).toHaveLength(1);

    act(() => {
      result.current.handleClearHistory();
    });

    expect(result.current.testInput).toBe("");
    expect(result.current.lastScanResult).toBeNull();
    expect(result.current.recentScans).toEqual([]);
  });

  it("limita el historial reciente a maximo 5 escaneos", () => {
    const { result } = renderHook(() => useBarcodeScannerTester());

    for (let i = 1; i <= 7; i += 1) {
      act(() => {
        result.current.handleInputChange({ target: { value: `CODE-${i}` } });
      });
      act(() => {
        result.current.handleKeyDown({ key: "Enter", preventDefault: vi.fn() });
      });
    }

    expect(result.current.recentScans).toHaveLength(5);
    expect(result.current.recentScans[0].code).toBe("CODE-7");
    expect(result.current.recentScans[4].code).toBe("CODE-3");
  });
});
