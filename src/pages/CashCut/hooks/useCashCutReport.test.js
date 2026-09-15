import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: { channel: vi.fn(), removeChannel: vi.fn() },
}));

vi.mock("../services/cashCutReportService", () => ({
  calculateSalesTotals: vi.fn(() => ({
    ventasTotales: 0,
    subtotal: 0,
    tax: 0,
  })),
  calculateCancellations: vi.fn(() => ({
    devolucionesTotales: 0,
    devolucionesAfectanCaja: 0,
    cancelaciones: [],
  })),
  calculatePartialReturns: vi.fn(() => ({
    devolucionesParcialesTotales: 0,
    devolucionesParcialesAfectanCaja: 0,
    devolucionesParciales: [],
  })),
  calculateRewardSummary: vi.fn(() => ({
    canjesAplicados: 0,
    puntosUsados: 0,
    canjesRevertidos: 0,
    puntosDevueltos: 0,
  })),
  calculateMethodTotals: vi.fn(() => ({
    ventasEfectivo: 0,
    ventasTerminal: 0,
    ventasTransferencia: 0,
  })),
  calculateRefundsByMethod: vi.fn(() => ({
    devolucionesEfectivoMetodo: 0,
    devolucionesTerminalMetodo: 0,
    devolucionesTransferenciaMetodo: 0,
  })),
  calculateMethodNetTotals: vi.fn(() => ({
    ventasEfectivoNeto: 0,
    ventasTerminalNeto: 0,
    ventasTransferenciaNeto: 0,
  })),
  calculateDiscountTotal: vi.fn(() => 0),
  calculateNetSales: vi.fn(() => 0),
  calculateDepartmentsTotal: vi.fn(() => 0),
  calculateCashInRegister: vi.fn(() => 0),
  resolveCutDisplay: vi.fn(() => ({
    expectedDisplay: 0,
    countedDisplay: 0,
    differenceDisplay: 0,
  })),
  buildNetPaymentMethodDetails: vi.fn(() => []),
  groupPaymentsByMethod: vi.fn(() => []),
  calculateDollarTotals: vi.fn(() => ({
    ventasDolaresUsd: 0,
    ventasDolaresMxn: 0,
  })),
  groupSalesByDepartment: vi.fn(() => []),
  splitCashMovements: vi.fn(() => ({
    entradas: [],
    salidas: [],
    totalEntradas: 0,
    totalSalidas: 0,
  })),
  fetchActiveSession: vi.fn(),
  fetchBranchName: vi.fn(),
  fetchCutsHistory: vi.fn(),
  fetchExistingShiftCut: vi.fn(),
  fetchSalesByShift: vi.fn(),
  fetchCancellationsByShift: vi.fn(),
  fetchPartialReturnsByShift: vi.fn(),
  fetchRewardRedemptions: vi.fn(),
  fetchPaymentsByMethod: vi.fn(),
  fetchUsdPayments: vi.fn(),
  fetchDepartmentSales: vi.fn(),
  fetchCashMovementsBySession: vi.fn(),
  fetchHistoricalCutDetail: vi.fn(),
}));

import { supabase } from "../../../lib/supabaseClient";
import {
  fetchActiveSession,
  fetchBranchName,
  fetchCutsHistory,
  fetchExistingShiftCut,
  fetchSalesByShift,
  fetchCancellationsByShift,
  fetchPartialReturnsByShift,
  fetchRewardRedemptions,
  fetchCashMovementsBySession,
  fetchHistoricalCutDetail,
} from "../services/cashCutReportService";
import { useCashCutReport } from "./useCashCutReport";

const user = { id: "u1" };

const activeSession = {
  id: "s1",
  branch_id: "b1",
  opened_at: "2026-09-01T09:00:00.000Z",
  opening_amount: "100",
};

const historyCut = {
  id: "c1",
  branch_id: "b1",
  user_id: "u1",
  cash_register_session_id: "s1",
  created_at: "2026-09-01T18:00:00.000Z",
  users: { username: "juan" },
  cash_register_sessions: {
    id: "s1",
    branch_id: "b1",
    opened_at: "2026-09-01T09:00:00.000Z",
    opening_amount: "100",
    status: "closed",
  },
};

const channelMock = { on: vi.fn(), subscribe: vi.fn() };

const configureEmptyShift = () => {
  fetchSalesByShift.mockResolvedValue({ data: [], error: null });
  fetchCancellationsByShift.mockResolvedValue({ data: [], error: null });
  fetchPartialReturnsByShift.mockResolvedValue({ data: [], error: null });
  fetchRewardRedemptions.mockResolvedValue({ data: [], error: null });
  fetchCashMovementsBySession.mockResolvedValue({ data: [], error: null });
};

describe("useCashCutReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    channelMock.on.mockReturnValue(channelMock);
    channelMock.subscribe.mockReturnValue(channelMock);
    supabase.channel.mockReturnValue(channelMock);

    fetchActiveSession.mockResolvedValue({ data: null, error: null });
    fetchBranchName.mockResolvedValue({ data: null, error: null });
    fetchCutsHistory.mockResolvedValue({ data: [], error: null });
    fetchExistingShiftCut.mockResolvedValue({ data: null, error: null });
    configureEmptyShift();
  });

  it("sin turno activo termina la carga y limpia el estado", async () => {
    const { result } = renderHook(() => useCashCutReport({ user }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchActiveSession).toHaveBeenCalledWith({ userId: "u1" });
    expect(result.current.session).toBeNull();
    expect(result.current.hasShiftCut).toBe(false);
    expect(fetchCutsHistory).not.toHaveBeenCalled();
  });

  it("con turno activo carga historial, sucursal y sesion", async () => {
    fetchActiveSession.mockResolvedValue({ data: activeSession, error: null });
    fetchBranchName.mockResolvedValue({ data: { name: "Norte" }, error: null });
    fetchCutsHistory.mockResolvedValue({ data: [historyCut], error: null });

    const { result } = renderHook(() => useCashCutReport({ user }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchCutsHistory).toHaveBeenCalledWith({ branchId: "b1" });
    expect(result.current.session?.id).toBe("s1");
    expect(result.current.branchName).toBe("Norte");
    expect(result.current.openingAmount).toBe(100);
    expect(result.current.cutsHistory).toHaveLength(1);
    expect(result.current.cutsHistory[0].label).toContain("Corte");
    expect(result.current.isHistoricalView).toBe(false);
  });

  it("registra el error de sesion y no deja turno", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchActiveSession.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });

    const { result } = renderHook(() => useCashCutReport({ user }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.session).toBeNull();
    expect(result.current.branchName).toBe("");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("cambia a un corte historico del historial cargado", async () => {
    fetchActiveSession.mockResolvedValue({ data: activeSession, error: null });
    fetchBranchName.mockResolvedValue({ data: { name: "Norte" }, error: null });
    fetchCutsHistory.mockResolvedValue({ data: [historyCut], error: null });

    const { result } = renderHook(() => useCashCutReport({ user }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.changeSelectedCut("c1");
    });

    await waitFor(() => expect(result.current.isHistoricalView).toBe(true));
    expect(result.current.historicalCut?.id).toBe("c1");
    expect(result.current.hasShiftCut).toBe(true);
    expect(result.current.session?.id).toBe("s1");
  });

  it("carga el detalle de un corte historico que no esta en el historial", async () => {
    fetchActiveSession.mockResolvedValue({ data: activeSession, error: null });
    fetchBranchName.mockResolvedValue({ data: { name: "Norte" }, error: null });
    fetchCutsHistory.mockResolvedValue({ data: [], error: null });
    fetchHistoricalCutDetail.mockResolvedValue({ data: historyCut, error: null });

    const { result } = renderHook(() => useCashCutReport({ user }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.changeSelectedCut("c1");
    });

    expect(fetchHistoricalCutDetail).toHaveBeenCalledWith({ cutId: "c1" });
    expect(result.current.isHistoricalView).toBe(true);
    expect(result.current.historicalCut?.id).toBe("c1");
    expect(result.current.session?.id).toBe("s1");
  });

  it("vuelve a la vista actual al seleccionar current", async () => {
    fetchActiveSession.mockResolvedValue({ data: activeSession, error: null });
    fetchBranchName.mockResolvedValue({ data: { name: "Norte" }, error: null });
    fetchCutsHistory.mockResolvedValue({ data: [historyCut], error: null });

    const { result } = renderHook(() => useCashCutReport({ user }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.changeSelectedCut("c1");
    });
    await waitFor(() => expect(result.current.isHistoricalView).toBe(true));

    await act(async () => {
      await result.current.changeSelectedCut("current");
    });

    await waitFor(() => expect(result.current.isHistoricalView).toBe(false));
    expect(result.current.historicalCut).toBeNull();
    expect(result.current.selectedCutId).toBe("current");
    expect(result.current.session?.id).toBe("s1");
  });

  it("marca hasShiftCut y avisa cuando el turno ya tiene corte", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    fetchActiveSession.mockResolvedValue({ data: activeSession, error: null });
    fetchBranchName.mockResolvedValue({ data: { name: "Norte" }, error: null });
    fetchCutsHistory.mockResolvedValue({ data: [historyCut], error: null });
    fetchExistingShiftCut.mockResolvedValue({
      data: { id: "cut1", created_at: "2026-09-01T18:00:00.000Z" },
      error: null,
    });

    const { result } = renderHook(() => useCashCutReport({ user }));

    await waitFor(() => expect(result.current.hasShiftCut).toBe(true));

    expect(result.current.currentShiftCut?.id).toBe("cut1");
    expect(setItemSpy).toHaveBeenCalledWith("shift_cut_done", "true");
    expect(dispatchSpy).toHaveBeenCalled();

    setItemSpy.mockRestore();
    dispatchSpy.mockRestore();
  });

  it("resetLocalState limpia sesion y seleccion", async () => {
    fetchActiveSession.mockResolvedValue({ data: activeSession, error: null });
    fetchBranchName.mockResolvedValue({ data: { name: "Norte" }, error: null });
    fetchCutsHistory.mockResolvedValue({ data: [historyCut], error: null });

    const { result } = renderHook(() => useCashCutReport({ user }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.resetLocalState();
    });

    expect(result.current.session).toBeNull();
    expect(result.current.selectedCutId).toBe("current");
    expect(result.current.historicalCut).toBeNull();
    expect(result.current.hasShiftCut).toBe(false);
  });

  it("suscribe realtime con el turno activo y limpia el canal", async () => {
    fetchActiveSession.mockResolvedValue({ data: activeSession, error: null });
    fetchBranchName.mockResolvedValue({ data: { name: "Norte" }, error: null });
    fetchCutsHistory.mockResolvedValue({ data: [historyCut], error: null });

    const { unmount } = renderHook(() => useCashCutReport({ user }));

    await waitFor(() =>
      expect(supabase.channel).toHaveBeenCalledWith("cashcut-realtime-s1")
    );

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalledWith(channelMock);
  });
});
