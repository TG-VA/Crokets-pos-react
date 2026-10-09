import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  getCashOperationSettings,
  saveCashOperationSettings,
  triggerCashDrawerKick,
  DEFAULT_CASH_OPERATION_SETTINGS,
} from "./cashOperationSettingsService";

const STORAGE_KEY = "cash_operation_settings";

describe("cashOperationSettingsService", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    if (window.electronAPI) {
      delete window.electronAPI;
    }
  });

  it("devuelve valores por defecto cuando no hay configuración guardada", () => {
    const result = getCashOperationSettings();

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.defaultOpeningCash).toBe(0);
    expect(result.allowZeroOpening).toBe(true);
    expect(result.maxOpeningCashEnabled).toBe(true);
    expect(result.minOpeningCashEnabled).toBe(false);
    expect(result.minOpeningCash).toBe(0);
    expect(result.drawerCashLimit).toBe(0);
    expect(result.drawerAlertEnabled).toBe(false);
    expect(result.requireExitReason).toBe(true);
    expect(result.blindCountCut).toBe(false);
    expect(result.cutToleranceAmount).toBe(0);
    expect(result.requireCutDifferenceNote).toBe(true);
    expect(result.cashDrawerEnabled).toBe(false);
    expect(result.cashDrawerTrigger).toBe("cash_only");
    expect(result.cashDrawerConnection).toBe("printer_rj11");
  });

  it("sanitiza valores inválidos y aplica límites", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        defaultOpeningCash: -100,
        allowZeroOpening: "false",
        drawerCashLimit: "invalid",
        drawerAlertEnabled: 1,
        requireExitReason: 0,
        blindCountCut: "yes",
        cutToleranceAmount: -5,
        requireCutDifferenceNote: null,
        cashDrawerEnabled: "true",
        cashDrawerTrigger: "invalid",
        cashDrawerConnection: "usb",
      })
    );

    const result = getCashOperationSettings();

    expect(result.defaultOpeningCash).toBe(0);
    expect(result.allowZeroOpening).toBe(true);
    expect(result.maxOpeningCashEnabled).toBe(true);
    expect(result.minOpeningCashEnabled).toBe(false);
    expect(result.minOpeningCash).toBe(0);
    expect(result.drawerCashLimit).toBe(0);
    expect(result.drawerAlertEnabled).toBe(false);
    expect(result.requireExitReason).toBe(true);
    expect(result.blindCountCut).toBe(false);
    expect(result.cutToleranceAmount).toBe(0);
    expect(result.requireCutDifferenceNote).toBe(true);
    expect(result.cashDrawerEnabled).toBe(false);
    expect(result.cashDrawerTrigger).toBe("cash_only");
    expect(result.cashDrawerConnection).toBe("printer_rj11");
  });

  it("guarda y recupera configuraciones válidas", () => {
    const saved = saveCashOperationSettings({
      defaultOpeningCash: 500,
      allowZeroOpening: false,
      maxOpeningCashEnabled: false,
      minOpeningCashEnabled: true,
      minOpeningCash: 100,
      drawerCashLimit: 10000,
      drawerAlertEnabled: true,
      requireExitReason: false,
      blindCountCut: true,
      cutToleranceAmount: 50,
      requireCutDifferenceNote: false,
      cashDrawerEnabled: true,
      cashDrawerTrigger: "all_sales",
      cashDrawerConnection: "manual",
    });

    expect(saved.success).toBe(true);
    expect(saved.error).toBeNull();

    const loaded = getCashOperationSettings();
    expect(loaded.defaultOpeningCash).toBe(500);
    expect(loaded.allowZeroOpening).toBe(false);
    expect(loaded.maxOpeningCashEnabled).toBe(false);
    expect(loaded.minOpeningCashEnabled).toBe(true);
    expect(loaded.minOpeningCash).toBe(100);
    expect(loaded.drawerCashLimit).toBe(10000);
    expect(loaded.drawerAlertEnabled).toBe(true);
    expect(loaded.requireExitReason).toBe(false);
    expect(loaded.blindCountCut).toBe(true);
    expect(loaded.cutToleranceAmount).toBe(50);
    expect(loaded.requireCutDifferenceNote).toBe(false);
    expect(loaded.cashDrawerEnabled).toBe(true);
    expect(loaded.cashDrawerTrigger).toBe("all_sales");
    expect(loaded.cashDrawerConnection).toBe("manual");
  });

  it("deriva allowZeroOpening a partir del fondo mínimo obligatorio", () => {
    saveCashOperationSettings({
      minOpeningCashEnabled: true,
      minOpeningCash: 250,
    });

    const withMin = getCashOperationSettings();
    expect(withMin.minOpeningCashEnabled).toBe(true);
    expect(withMin.minOpeningCash).toBe(250);
    expect(withMin.allowZeroOpening).toBe(false);

    saveCashOperationSettings({ minOpeningCashEnabled: false });

    const withoutMin = getCashOperationSettings();
    expect(withoutMin.minOpeningCashEnabled).toBe(false);
    expect(withoutMin.allowZeroOpening).toBe(true);
  });

  it("acepta solo los triggers cash_only y all_sales", () => {
    const saved = saveCashOperationSettings({ cashDrawerTrigger: "all_sales" });
    expect(saved.cashDrawerTrigger).toBe("all_sales");

    const saved2 = saveCashOperationSettings({ cashDrawerTrigger: "cash_only" });
    expect(saved2.cashDrawerTrigger).toBe("cash_only");

    const savedInvalid = saveCashOperationSettings({
      cashDrawerTrigger: "cash_and_movements",
    });
    expect(savedInvalid.cashDrawerTrigger).toBe("cash_only");
  });

  it("normaliza el trigger legacy cash_and_movements a cash_only al recuperar", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ cashDrawerTrigger: "cash_and_movements" })
    );

    const result = getCashOperationSettings();
    expect(result.cashDrawerTrigger).toBe("cash_only");
  });

  it("devuelve contrato exitoso al disparar cajón en navegador web", async () => {
    const result = await triggerCashDrawerKick();

    expect(result.success).toBe(true);
    expect(result.message).toContain("cajón de dinero");
    expect(result.error).toBeNull();
  });

  it("invoca canal IPC cuando existe electronAPI", async () => {
    window.electronAPI = {
      invoke: vi.fn().mockResolvedValue({
        success: true,
        message: "Pulso enviado",
      }),
    };

    const result = await triggerCashDrawerKick();

    expect(window.electronAPI.invoke).toHaveBeenCalledWith("open-cash-drawer");
    expect(result.success).toBe(true);
    expect(result.message).toBe("Pulso enviado");
  });

  it("maneja errores del canal IPC correctamente", async () => {
    window.electronAPI = {
      invoke: vi.fn().mockRejectedValue(new Error("No printer")),
    };

    const result = await triggerCashDrawerKick();

    expect(result.success).toBe(false);
    expect(result.error).toBe("No printer");
    expect(result.message).toContain("No se pudo abrir");
  });

  it("expone defaults constantes", () => {
    expect(DEFAULT_CASH_OPERATION_SETTINGS.defaultOpeningCash).toBe(0);
    expect(DEFAULT_CASH_OPERATION_SETTINGS.maxOpeningCashEnabled).toBe(true);
    expect(DEFAULT_CASH_OPERATION_SETTINGS.minOpeningCashEnabled).toBe(false);
    expect(DEFAULT_CASH_OPERATION_SETTINGS.minOpeningCash).toBe(0);
    expect(DEFAULT_CASH_OPERATION_SETTINGS.cashDrawerTrigger).toBe("cash_only");
  });
});
