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
  loadCashOperationSettings,
  persistCashOperationSettings,
  triggerCashDrawerKick,
} = vi.hoisted(() => ({
  getCashOperationSettings: vi.fn(),
  loadCashOperationSettings: vi.fn(),
  persistCashOperationSettings: vi.fn(),
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
  loadCashOperationSettings,
  persistCashOperationSettings,
  triggerCashDrawerKick,
}));

const baseSettings = {
  maxOpeningCashEnabled: true,
  defaultExchangeRate: 18.5,
};

const renderUseSettingsCash = (props = { branchId: "branch-1" }) =>
  renderHook((hookProps) => useSettingsCash(hookProps), {
    initialProps: props,
  });

describe("useSettingsCash", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    getCashOperationSettings.mockReturnValue({
      success: true,
      ...baseSettings,
    });
    loadCashOperationSettings.mockResolvedValue({
      success: true,
      ...baseSettings,
      error: null,
      source: "cache",
    });
    persistCashOperationSettings.mockResolvedValue({
      success: true,
      partial: false,
      synced: true,
      ...baseSettings,
      error: null,
    });
  });

  it("hidrata la configuracion desde la sucursal activa", async () => {
    checkUserIsAdmin.mockResolvedValue(true);
    getCashMaxOpeningAmount.mockResolvedValue({
      success: true,
      amount: 5000,
      error: null,
    });
    loadCashOperationSettings.mockResolvedValue({
      success: true,
      ...baseSettings,
      defaultOpeningCash: 888,
      error: null,
      source: "remote",
    });

    const { result } = renderUseSettingsCash();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(loadCashOperationSettings).toHaveBeenCalledWith({
      branchId: "branch-1",
    });
    expect(result.current.settings.defaultOpeningCash).toBe(888);
    expect(result.current.adminLoading).toBe(false);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.cashMax).toBe("5000");
  });

  it("reporta el fallback offline con los valores locales", async () => {
    checkUserIsAdmin.mockResolvedValue(true);
    getCashMaxOpeningAmount.mockResolvedValue({
      success: true,
      amount: 1000,
      error: null,
    });
    loadCashOperationSettings.mockResolvedValue({
      success: true,
      ...baseSettings,
      error: "Sin conexión con la sucursal.",
      source: "cache",
    });

    const { result } = renderUseSettingsCash();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.feedback).toEqual({
      type: "error",
      message: "Sin conexión con la sucursal.",
    });
  });

  it("no consulta el tope cuando el usuario no es administrador", async () => {
    checkUserIsAdmin.mockResolvedValue(false);

    const { result } = renderUseSettingsCash();

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

    const { result } = renderUseSettingsCash();
    await waitFor(() => expect(result.current.adminLoading).toBe(false));

    await act(async () => {
      await result.current.handleSave();
    });

    expect(updateCashMaxOpeningAmount).toHaveBeenCalledWith("1000");
    expect(persistCashOperationSettings).toHaveBeenCalledWith({
      branchId: "branch-1",
      settings: expect.objectContaining({
        maxOpeningCashEnabled: true,
        defaultExchangeRate: 18.5,
      }),
    });
    expect(result.current.feedback.type).toBe("success");
  });

  it("reporta guardado parcial cuando la sucursal no se sincroniza", async () => {
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
    persistCashOperationSettings.mockResolvedValue({
      success: true,
      partial: true,
      synced: false,
      ...baseSettings,
      error: "offline",
    });

    const { result } = renderUseSettingsCash();
    await waitFor(() => expect(result.current.adminLoading).toBe(false));

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.feedback.type).toBe("error");
    expect(result.current.feedback.message).toContain("solo en esta máquina");
  });

  it("bloquea el guardado de usuarios no administradores", async () => {
    checkUserIsAdmin.mockResolvedValue(false);

    const { result } = renderUseSettingsCash();
    await waitFor(() => expect(result.current.adminLoading).toBe(false));

    await act(async () => {
      await result.current.handleSave();
    });

    expect(updateCashMaxOpeningAmount).not.toHaveBeenCalled();
    expect(persistCashOperationSettings).not.toHaveBeenCalled();
    expect(result.current.feedback.type).toBe("error");
  });

  it("reporta el fallo de la prueba del cajon", async () => {
    checkUserIsAdmin.mockResolvedValue(false);
    triggerCashDrawerKick.mockResolvedValue({
      success: false,
      message: "Sin impresora",
    });

    const { result } = renderUseSettingsCash();
    await waitFor(() => expect(result.current.adminLoading).toBe(false));

    vi.useFakeTimers();
    try {
      await act(async () => {
        await result.current.handleTestDrawer();
      });

      expect(result.current.drawerFeedback).toEqual({
        type: "error",
        message: "Sin impresora",
      });
      expect(result.current.testingDrawer).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(2500);
      });
      expect(result.current.testingDrawer).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("mantiene el bloqueo durante el cooldown y descarta dobles clics", async () => {
    checkUserIsAdmin.mockResolvedValue(false);
    triggerCashDrawerKick.mockResolvedValue({
      success: true,
      message: "Pulso de apertura enviado al cajón de dinero.",
    });

    const { result } = renderUseSettingsCash();
    await waitFor(() => expect(result.current.adminLoading).toBe(false));

    vi.useFakeTimers();
    try {
      await act(async () => {
        await result.current.handleTestDrawer();
      });

      expect(triggerCashDrawerKick).toHaveBeenCalledTimes(1);
      expect(result.current.testingDrawer).toBe(true);
      expect(result.current.drawerFeedback).toEqual({
        type: "success",
        message: "Pulso de apertura enviado al cajón de dinero.",
      });

      await act(async () => {
        await result.current.handleTestDrawer();
      });
      expect(triggerCashDrawerKick).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(2500);
      });
      expect(result.current.testingDrawer).toBe(false);

      await act(async () => {
        await result.current.handleTestDrawer();
      });
      expect(triggerCashDrawerKick).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
