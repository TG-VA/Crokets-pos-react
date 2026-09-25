import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("../services/reportsDashboardService", () => ({
  getBranchesCatalog: vi.fn(() => Promise.resolve([])),
  getEmptyReportsDashboard: vi.fn(() => ({
    meta: { branchId: null, generatedAt: null },
  })),
  getReportsDashboard: vi.fn(),
}));

import { getReportsDashboard } from "../services/reportsDashboardService";
import useReportsDashboard from "./useReportsDashboard";

const createDashboard = (generatedAt) => ({
  meta: { branchId: "ALL", generatedAt },
});

const AUTO_REFRESH_INTERVAL = 300_000;

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe("useReportsDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("carga el dashboard y restablece loading al resolver correctamente", async () => {
    getReportsDashboard.mockResolvedValue(
      createDashboard("2026-01-01T00:00:00.000Z")
    );

    const { result } = renderHook(() => useReportsDashboard());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.refreshing).toBe(false);
    expect(result.current.error).toBe("");
    expect(result.current.dashboard.meta.generatedAt).toBe(
      "2026-01-01T00:00:00.000Z"
    );
  });

  it("restablece loading y expone el mensaje cuando la carga falla", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getReportsDashboard.mockRejectedValue(new Error("sin permisos"));

    const { result } = renderHook(() => useReportsDashboard());

    await waitFor(() => expect(result.current.error).toBe("sin permisos"));

    expect(result.current.loading).toBe(false);
    expect(result.current.refreshing).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("usa el mensaje por defecto cuando el error no trae texto", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getReportsDashboard.mockRejectedValue(new Error(""));

    const { result } = renderHook(() => useReportsDashboard());

    await waitFor(() =>
      expect(result.current.error).toBe(
        "No se pudo cargar el resumen de reportes."
      )
    );
    expect(result.current.loading).toBe(false);
  });

  it("descarta la respuesta obsoleta sin pisar el estado de la petición vigente", async () => {
    const obsolete = createDeferred();

    getReportsDashboard
      .mockReturnValueOnce(obsolete.promise)
      .mockResolvedValueOnce(createDashboard("VIGENTE"));

    const { result } = renderHook(() => useReportsDashboard());

    await waitFor(() => expect(getReportsDashboard).toHaveBeenCalledTimes(1));
    expect(result.current.loading).toBe(true);

    act(() => {
      result.current.setSelectedBranchId("SUC-2");
    });

    await waitFor(() => expect(getReportsDashboard).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getReportsDashboard).toHaveBeenLastCalledWith("SUC-2");
    expect(result.current.dashboard.meta.generatedAt).toBe("VIGENTE");

    await act(async () => {
      obsolete.resolve(createDashboard("OBSOLETA"));
      await obsolete.promise;
    });

    expect(result.current.dashboard.meta.generatedAt).toBe("VIGENTE");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("");
  });

  it("no propaga el fallo de una petición obsoleta al estado visible", async () => {
    const obsolete = createDeferred();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    getReportsDashboard
      .mockReturnValueOnce(obsolete.promise)
      .mockResolvedValueOnce(createDashboard("VIGENTE"));

    const { result } = renderHook(() => useReportsDashboard());

    await waitFor(() => expect(getReportsDashboard).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.setSelectedBranchId("SUC-2");
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      obsolete.reject(new Error("fallo obsoleto"));
      await obsolete.promise.catch(() => {});
    });

    expect(result.current.error).toBe("");
    expect(result.current.dashboard.meta.generatedAt).toBe("VIGENTE");
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("mantiene loading activo si la petición obsoleta resuelve primero", async () => {
    const obsolete = createDeferred();
    const current = createDeferred();

    getReportsDashboard
      .mockReturnValueOnce(obsolete.promise)
      .mockReturnValueOnce(current.promise);

    const { result } = renderHook(() => useReportsDashboard());

    await waitFor(() => expect(getReportsDashboard).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.setSelectedBranchId("SUC-2");
    });

    await waitFor(() => expect(getReportsDashboard).toHaveBeenCalledTimes(2));

    await act(async () => {
      obsolete.resolve(createDashboard("OBSOLETA"));
      await obsolete.promise;
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      current.resolve(createDashboard("VIGENTE"));
      await current.promise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.dashboard.meta.generatedAt).toBe("VIGENTE");
  });

  it("limpia su propio intervalo de auto-refresh al desmontar", async () => {
    const setSpy = vi.spyOn(window, "setInterval");
    const clearSpy = vi.spyOn(window, "clearInterval");
    getReportsDashboard.mockResolvedValue(createDashboard("2026-01-01"));

    const { result, unmount } = renderHook(() => useReportsDashboard());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const refreshIndex = setSpy.mock.calls.findIndex(
      ([, delay]) => delay === AUTO_REFRESH_INTERVAL
    );
    expect(refreshIndex).toBeGreaterThanOrEqual(0);

    const refreshIntervalId = setSpy.mock.results[refreshIndex].value;
    expect(clearSpy).not.toHaveBeenCalledWith(refreshIntervalId);

    unmount();

    expect(clearSpy).toHaveBeenCalledWith(refreshIntervalId);
  });
});
