import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import useSalesDrawerAlert from "./useSalesDrawerAlert";
import { getAvailableCash } from "../services/salesCashService";
import { getCashOperationSettings } from "../../../services/cashOperationSettingsService";

vi.mock("../services/salesCashService", () => ({
  getAvailableCash: vi.fn(),
}));

vi.mock("../../../services/cashOperationSettingsService", () => ({
  getCashOperationSettings: vi.fn(),
}));

const baseProps = (overrides = {}) => ({
  branchId: "branch-1",
  userId: "user-1",
  enabled: true,
  getOpenCashSession: vi.fn(() => Promise.resolve({ id: "session-1" })),
  refreshKey: "0|no-sale",
  ...overrides,
});

describe("useSalesDrawerAlert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el aviso cuando el efectivo supera el limite configurado", async () => {
    getCashOperationSettings.mockReturnValue({
      drawerAlertEnabled: true,
      drawerCashLimit: 5000,
    });
    getAvailableCash.mockResolvedValue(6200);

    const { result } = renderHook(() => useSalesDrawerAlert(baseProps()));

    await waitFor(() => expect(result.current.show).toBe(true));
    expect(result.current.limit).toBe(5000);
    expect(result.current.message).toContain("$5,000");
  });

  it("no muestra el aviso cuando el efectivo no supera el limite", async () => {
    getCashOperationSettings.mockReturnValue({
      drawerAlertEnabled: true,
      drawerCashLimit: 5000,
    });
    getAvailableCash.mockResolvedValue(1200);

    const { result } = renderHook(() => useSalesDrawerAlert(baseProps()));

    await waitFor(() => expect(getAvailableCash).toHaveBeenCalled());
    expect(result.current.show).toBe(false);
  });

  it("no consulta la caja cuando la alerta esta deshabilitada", async () => {
    getCashOperationSettings.mockReturnValue({
      drawerAlertEnabled: false,
      drawerCashLimit: 5000,
    });

    const { result } = renderHook(() => useSalesDrawerAlert(baseProps()));

    await waitFor(() => expect(getCashOperationSettings).toHaveBeenCalled());
    expect(getAvailableCash).not.toHaveBeenCalled();
    expect(result.current.show).toBe(false);
  });

  it("traduce un error de consulta a un aviso desactivado", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getCashOperationSettings.mockReturnValue({
      drawerAlertEnabled: true,
      drawerCashLimit: 5000,
    });
    getAvailableCash.mockRejectedValue(new Error("sin conexion"));

    const { result } = renderHook(() => useSalesDrawerAlert(baseProps()));

    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(result.current.show).toBe(false);
    errorSpy.mockRestore();
  });

  it("no consulta nada mientras el modulo no esta habilitado", () => {
    getCashOperationSettings.mockReturnValue({
      drawerAlertEnabled: true,
      drawerCashLimit: 5000,
    });

    renderHook(() => useSalesDrawerAlert(baseProps({ enabled: false })));

    expect(getAvailableCash).not.toHaveBeenCalled();
  });
});
