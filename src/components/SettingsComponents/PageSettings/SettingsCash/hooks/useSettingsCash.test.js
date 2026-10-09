import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

import useSettingsCash from "./useSettingsCash";

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));
const { checkUserIsAdmin } = vi.hoisted(() => ({
  checkUserIsAdmin: vi.fn(),
}));
const { getCashMaxOpeningAmount, updateCashMaxOpeningAmount } = vi.hoisted(
  () => ({
    getCashMaxOpeningAmount: vi.fn(),
    updateCashMaxOpeningAmount: vi.fn(),
  })
);
const {
  getCashOperationSettings,
  saveCashOperationSettings,
  triggerCashDrawerKick,
} = vi.hoisted(() => ({
  getCashOperationSettings: vi.fn(),
  saveCashOperationSettings: vi.fn(),
  triggerCashDrawerKick: vi.fn(),
}));

vi.mock("../../../../../contexts/AuthContext", () => ({ useAuth }));
vi.mock("../../../../../lib/permissionsService", () => ({
  checkUserIsAdmin,
}));
vi.mock("../../../../../pages/Settings/services/cashSettingsService", () => ({
  getCashMaxOpeningAmount,
  updateCashMaxOpeningAmount,
}));
vi.mock("../../../../../services/cashOperationSettingsService", () => ({
  getCashOperationSettings,
  saveCashOperationSettings,
  triggerCashDrawerKick,
}));

const baseSettings = {
  maxOpeningCashEnabled: true,
  defaultExchangeRate: 18.5,
};

describe("useSettingsCash", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    getCashOperationSettings.mockReturnValue({ success: true, ...baseSettings });
    saveCashOperationSettings.mockReturnValue({
      success: true,
      ...baseSettings,
    });
  });

  it("carga configuracion y tope para administradores", async () => {
    checkUserIsAdmin.mockResolvedValue(true);
    getCashMaxOpeningAmount.mockResolvedValue({
      success: true,
      amount: 5000,
      error: null,
    });

    const { result } = renderHook(() => useSettingsCash());

    await waitFor(() => expect(result.current.adminLoading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.cashMax).toBe("5000");
  });

  it("no consulta el tope cuando el usuario no es administrador", async () => {
    checkUserIsAdmin.mockResolvedValue(false);

    const { result } = renderHook(() => useSettingsCash());

    await waitFor(() => expect(result.current.adminLoading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
    expect(getCashMaxOpeningAmount).not.toHaveBeenCalled();
  });

  it("guarda la configuracion y el tope de apertura", async () => {
    checkUserIsAdmin.mockResolvedValue(true);
    getCashMaxOpeningAmount.mockResolvedValue({
      success: true,
      amount: 1000,
      error: null,
    });
    updateCashMaxOpeningAmount.mockResolvedValue({
      success: true,
      amount: 2500,
      error: null,
    });

    const { result } = renderHook(() => useSettingsCash());
    await waitFor(() => expect(result.current.adminLoading).toBe(false));

    await act(async () => {
      await result.current.handleSave();
    });

    expect(updateCashMaxOpeningAmount).toHaveBeenCalledWith("1000");
    expect(saveCashOperationSettings).toHaveBeenCalled();
    expect(result.current.feedback.type).toBe("success");
  });

  it("reporta el fallo de la prueba del cajon", async () => {
    checkUserIsAdmin.mockResolvedValue(false);
    triggerCashDrawerKick.mockResolvedValue({
      success: false,
      message: "Sin impresora",
    });

    const { result } = renderHook(() => useSettingsCash());
    await waitFor(() => expect(result.current.adminLoading).toBe(false));

    await act(async () => {
      await result.current.handleTestDrawer();
    });

    expect(result.current.testingDrawer).toBe(false);
    expect(result.current.drawerFeedback).toEqual({
      type: "error",
      message: "Sin impresora",
    });
  });
});
