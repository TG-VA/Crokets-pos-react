import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

/*
  Contrato del filtro de sucursal del reporte de caja: el hook arranca en todas
  las sucursales, no lee la sucursal operativa del cajero, y limpiar filtros lo
  devuelve a "ALL" dejando el reporte sin filtros activos.
*/

const { useBranch } = vi.hoisted(() => ({
  useBranch: vi.fn(() => ({
    branch: { id: "b9", name: "Merida" },
    setBranch: vi.fn(),
  })),
}));

vi.mock("../../../../../contexts/BranchContext", () => ({ useBranch }));

const { loadCashReportData, fetchBranchesList, fetchCashiersList } = vi.hoisted(
  () => ({
    loadCashReportData: vi.fn(),
    fetchBranchesList: vi.fn(),
    fetchCashiersList: vi.fn(),
  })
);

vi.mock("../services/cashReportService", () => ({
  loadCashReportData,
  fetchBranchesList,
  fetchCashiersList,
  fetchCashSessionDetail: vi.fn(),
  calculateCashReportKpis: vi.fn(() => ({})),
  calculateCashierDiscrepancies: vi.fn(() => []),
}));

vi.mock("../utils/cashReportExportUtils", () => ({
  exportCashReportToExcel: vi.fn(),
}));

import { useCashReport } from "./useCashReport";

const lastParams = () => loadCashReportData.mock.calls.at(-1)[0];

describe("useCashReport filtro de sucursal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBranch.mockReturnValue({
      branch: { id: "b9", name: "Merida" },
      setBranch: vi.fn(),
    });
    fetchBranchesList.mockResolvedValue([{ id: "b1", name: "Torres" }]);
    fetchCashiersList.mockResolvedValue([{ id: "c1", name: "Cajero" }]);
    loadCashReportData.mockImplementation((params, handlers) => {
      handlers.onData({
        sessions: [],
        movements: [],
        paymentMethodsSummary: [],
      });
      handlers.onSettled();
      return Promise.resolve();
    });
  });

  it("arranca en todas las sucursales y no consulta el contexto del cajero", async () => {
    const { result } = renderHook(() => useCashReport());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.selectedBranchId).toBe("ALL");
    expect(result.current.hasActiveFilters).toBe(false);
    expect(useBranch).not.toHaveBeenCalled();
  });

  it("consulta las tres consultas con la sucursal consolidada", async () => {
    renderHook(() => useCashReport());

    await waitFor(() => expect(loadCashReportData).toHaveBeenCalled());

    const params = lastParams();
    expect(params.sessionsParams.branchId).toBe("ALL");
    expect(params.movementsParams.branchId).toBe("ALL");
    expect(params.paymentsParams.branchId).toBe("ALL");
  });

  it("marca filtros activos al elegir una sucursal y los limpia al restablecer", async () => {
    const { result } = renderHook(() => useCashReport());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSelectedBranchId("b1"));

    await waitFor(() =>
      expect(lastParams().sessionsParams.branchId).toBe("b1")
    );
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.handleClearFilters());

    expect(result.current.selectedBranchId).toBe("ALL");
    await waitFor(() =>
      expect(lastParams().sessionsParams.branchId).toBe("ALL")
    );
    expect(result.current.hasActiveFilters).toBe(false);
    expect(useBranch).not.toHaveBeenCalled();
  });

  it("descarta el error de una peticion anterior mientras corre la nueva", async () => {
    loadCashReportData.mockImplementation((params, handlers) => {
      handlers.onError("Sin sesion abierta");
      handlers.onSettled();
      return Promise.resolve();
    });

    const { result } = renderHook(() => useCashReport());

    await waitFor(() => expect(result.current.error).toBe("Sin sesion abierta"));

    loadCashReportData.mockImplementation((params, handlers) => {
      handlers.onData({
        sessions: [],
        movements: [],
        paymentMethodsSummary: [],
      });
      handlers.onSettled();
      return Promise.resolve();
    });

    act(() => result.current.setSelectedBranchId("b1"));

    await waitFor(() => expect(result.current.error).toBeNull());
  });
});
