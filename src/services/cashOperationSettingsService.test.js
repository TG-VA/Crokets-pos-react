import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

import {
  getCashOperationSettings,
  saveCashOperationSettings,
  loadCashOperationSettings,
  persistCashOperationSettings,
  triggerCashDrawerKick,
  CASH_OPERATION_SETTING_KEY,
  DEFAULT_CASH_OPERATION_SETTINGS,
} from "./cashOperationSettingsService";
import { supabase } from "../lib/supabaseClient";

const STORAGE_KEY = "cash_operation_settings";

const buildQueryChain = ({
  data = null,
  error = null,
  upsertError = null,
} = {}) => {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error })),
    upsert: vi.fn(async () => ({ error: upsertError })),
  };
  return query;
};

describe("cashOperationSettingsService", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
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
    expect(result.requireCutDifferenceNote).toBe(true);
    expect(result.cashDrawerEnabled).toBe(false);
    expect(result.cashDrawerTrigger).toBe("cash_only");
    expect(result.cashDrawerConnection).toBe("printer_rj11");
    expect(result.acceptUsdPayments).toBe(true);
    expect(result.defaultExchangeRate).toBe(18.5);
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
        requireCutDifferenceNote: null,
        cashDrawerEnabled: "true",
        cashDrawerTrigger: "invalid",
        cashDrawerConnection: "usb",
        acceptUsdPayments: "yes",
        defaultExchangeRate: -2,
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
    expect(result.requireCutDifferenceNote).toBe(true);
    expect(result.cashDrawerEnabled).toBe(false);
    expect(result.cashDrawerTrigger).toBe("cash_only");
    expect(result.cashDrawerConnection).toBe("printer_rj11");
    expect(result.acceptUsdPayments).toBe(true);
    expect(result.defaultExchangeRate).toBe(18.5);
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
      requireCutDifferenceNote: false,
      cashDrawerEnabled: true,
      cashDrawerTrigger: "all_sales",
      cashDrawerConnection: "manual",
      acceptUsdPayments: false,
      defaultExchangeRate: 20,
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
    expect(loaded.requireCutDifferenceNote).toBe(false);
    expect(loaded.cashDrawerEnabled).toBe(true);
    expect(loaded.cashDrawerTrigger).toBe("all_sales");
    expect(loaded.cashDrawerConnection).toBe("manual");
    expect(loaded.acceptUsdPayments).toBe(false);
    expect(loaded.defaultExchangeRate).toBe(20);
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

  it("permite apertura en cero cuando el minimo obligatorio es cero", () => {
    saveCashOperationSettings({
      minOpeningCashEnabled: true,
      minOpeningCash: 0,
      allowZeroOpening: false,
    });

    const result = getCashOperationSettings();
    expect(result.minOpeningCashEnabled).toBe(true);
    expect(result.minOpeningCash).toBe(0);
    expect(result.allowZeroOpening).toBe(true);
  });

  it("sanea configuracion de dolares en get y save", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ acceptUsdPayments: false, defaultExchangeRate: 20.5 })
    );

    const loaded = getCashOperationSettings();
    expect(loaded.acceptUsdPayments).toBe(false);
    expect(loaded.defaultExchangeRate).toBe(20.5);

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ acceptUsdPayments: 1, defaultExchangeRate: 0 })
    );

    const invalid = getCashOperationSettings();
    expect(invalid.acceptUsdPayments).toBe(true);
    expect(invalid.defaultExchangeRate).toBe(18.5);

    const saved = saveCashOperationSettings({ defaultExchangeRate: 21 });
    expect(saved.defaultExchangeRate).toBe(21);
  });

  it("acepta solo los triggers cash_only y all_sales", () => {
    const saved = saveCashOperationSettings({ cashDrawerTrigger: "all_sales" });
    expect(saved.cashDrawerTrigger).toBe("all_sales");

    const saved2 = saveCashOperationSettings({
      cashDrawerTrigger: "cash_only",
    });
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

    const result = await triggerCashDrawerKick({
      printerDeviceName: "Termica",
      pin: 1,
    });

    expect(window.electronAPI.invoke).toHaveBeenCalledWith("open-cash-drawer", {
      deviceName: "Termica",
      pin: 1,
    });
    expect(result.success).toBe(true);
    expect(result.message).toBe("Pulso enviado");
  });

  it("resuelve la impresora configurada cuando no se pasa printerDeviceName explicito", async () => {
    localStorage.setItem("settings_selected_printer", "Epson TM-T20");
    window.electronAPI = {
      invoke: vi.fn().mockResolvedValue({
        success: true,
        message: "Pulso enviado",
      }),
    };

    const result = await triggerCashDrawerKick();

    expect(window.electronAPI.invoke).toHaveBeenCalledWith("open-cash-drawer", {
      deviceName: "Epson TM-T20",
      pin: undefined,
    });
    expect(result.success).toBe(true);
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
    expect(DEFAULT_CASH_OPERATION_SETTINGS.acceptUsdPayments).toBe(true);
    expect(DEFAULT_CASH_OPERATION_SETTINGS.defaultExchangeRate).toBe(18.5);
  });
});

describe("loadCashOperationSettings", () => {
  it("hidrata desde system_settings por branch_id y refresca el cache local", async () => {
    const query = buildQueryChain({
      data: {
        id: "setting-1",
        setting_key: CASH_OPERATION_SETTING_KEY,
        setting_value: JSON.stringify({
          defaultOpeningCash: 750,
          drawerCashLimit: 5000,
          drawerAlertEnabled: true,
          acceptUsdPayments: false,
          defaultExchangeRate: 19.75,
          blindCountCut: true,
        }),
        value_type: "json",
        branch_id: "branch-42",
      },
      error: null,
    });
    supabase.from.mockReturnValue(query);

    const result = await loadCashOperationSettings({ branchId: "branch-42" });

    expect(supabase.from).toHaveBeenCalledWith("system_settings");
    expect(query.eq).toHaveBeenCalledWith(
      "setting_key",
      CASH_OPERATION_SETTING_KEY
    );
    expect(query.eq).toHaveBeenCalledWith("branch_id", "branch-42");
    expect(result.success).toBe(true);
    expect(result.source).toBe("remote");
    expect(result.error).toBeNull();
    expect(result.defaultOpeningCash).toBe(750);
    expect(result.drawerCashLimit).toBe(5000);
    expect(result.drawerAlertEnabled).toBe(true);
    expect(result.acceptUsdPayments).toBe(false);
    expect(result.defaultExchangeRate).toBe(19.75);
    expect(result.blindCountCut).toBe(true);

    const cached = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(cached.defaultOpeningCash).toBe(750);
    expect(cached.drawerCashLimit).toBe(5000);
  });

  it("sanea los valores remotos antes de entregarlos y cachearlos", async () => {
    const query = buildQueryChain({
      data: {
        id: "setting-1",
        setting_value: JSON.stringify({
          defaultOpeningCash: -50,
          drawerCashLimit: "abc",
          drawerAlertEnabled: 1,
          cashDrawerTrigger: "cash_and_movements",
          cashDrawerConnection: "usb",
          acceptUsdPayments: "yes",
          defaultExchangeRate: -3,
          minOpeningCashEnabled: true,
          minOpeningCash: 250,
          allowZeroOpening: true,
        }),
      },
      error: null,
    });
    supabase.from.mockReturnValue(query);

    const result = await loadCashOperationSettings({ branchId: "branch-42" });

    expect(result.source).toBe("remote");
    expect(result.defaultOpeningCash).toBe(0);
    expect(result.drawerCashLimit).toBe(0);
    expect(result.drawerAlertEnabled).toBe(false);
    expect(result.cashDrawerTrigger).toBe("cash_only");
    expect(result.cashDrawerConnection).toBe("printer_rj11");
    expect(result.acceptUsdPayments).toBe(true);
    expect(result.defaultExchangeRate).toBe(18.5);
    expect(result.minOpeningCashEnabled).toBe(true);
    expect(result.minOpeningCash).toBe(250);
    expect(result.allowZeroOpening).toBe(false);
  });

  it("cae al cache local cuando Supabase responde con error", async () => {
    saveCashOperationSettings({ defaultOpeningCash: 300 });
    const query = buildQueryChain({
      data: null,
      error: { message: "network" },
    });
    supabase.from.mockReturnValue(query);

    const result = await loadCashOperationSettings({ branchId: "branch-42" });

    expect(result.success).toBe(true);
    expect(result.source).toBe("cache");
    expect(result.error).toBeTruthy();
    expect(result.defaultOpeningCash).toBe(300);
  });

  it("conserva la configuracion local cuando la sucursal no tiene registro", async () => {
    saveCashOperationSettings({ drawerCashLimit: 9000 });
    const query = buildQueryChain({ data: null, error: null });
    supabase.from.mockReturnValue(query);

    const result = await loadCashOperationSettings({ branchId: "branch-42" });

    expect(result.source).toBe("cache");
    expect(result.error).toBeNull();
    expect(result.drawerCashLimit).toBe(9000);
  });

  it("sin branchId responde desde el cache sin consultar la red", async () => {
    saveCashOperationSettings({ defaultExchangeRate: 16.9 });

    const result = await loadCashOperationSettings();

    expect(supabase.from).not.toHaveBeenCalled();
    expect(result.source).toBe("cache");
    expect(result.success).toBe(true);
    expect(result.defaultExchangeRate).toBe(16.9);
  });

  it("cae al cache cuando el payload remoto no es JSON valido", async () => {
    saveCashOperationSettings({ defaultExchangeRate: 20.2 });
    const query = buildQueryChain({
      data: { id: "setting-1", setting_value: "{broken" },
      error: null,
    });
    supabase.from.mockReturnValue(query);

    const result = await loadCashOperationSettings({ branchId: "branch-42" });

    expect(result.source).toBe("cache");
    expect(result.error).toBeTruthy();
    expect(result.defaultExchangeRate).toBe(20.2);
  });
});

describe("persistCashOperationSettings", () => {
  it("hace upsert atomico del registro de la sucursal sin select previo", async () => {
    const query = buildQueryChain({ data: null, error: null });
    supabase.from.mockReturnValue(query);

    const result = await persistCashOperationSettings({
      branchId: "branch-42",
      settings: { defaultOpeningCash: 500, drawerCashLimit: 12000 },
    });

    expect(result.success).toBe(true);
    expect(result.synced).toBe(true);
    expect(result.partial).toBe(false);
    expect(result.error).toBeNull();
    expect(result.defaultOpeningCash).toBe(500);

    expect(supabase.from).toHaveBeenCalledWith("system_settings");
    expect(query.maybeSingle).not.toHaveBeenCalled();
    expect(query.upsert).toHaveBeenCalledTimes(1);

    const payload = query.upsert.mock.calls[0][0];
    expect(payload.setting_key).toBe(CASH_OPERATION_SETTING_KEY);
    expect(payload.branch_id).toBe("branch-42");
    expect(payload.value_type).toBe("json");
    expect(payload.is_active).toBe(true);
    expect(payload.id).toBeUndefined();

    expect(query.upsert.mock.calls[0][1]).toEqual({
      onConflict: "setting_key,branch_id",
    });

    const persisted = JSON.parse(payload.setting_value);
    expect(persisted.defaultOpeningCash).toBe(500);
    expect(persisted.drawerCashLimit).toBe(12000);

    const cached = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(cached.defaultOpeningCash).toBe(500);
    expect(cached.drawerCashLimit).toBe(12000);
  });

  it("actualiza un registro existente por la misma via de upsert", async () => {
    const query = buildQueryChain({
      data: { id: "setting-9" },
      error: null,
    });
    supabase.from.mockReturnValue(query);

    const result = await persistCashOperationSettings({
      branchId: "branch-42",
      settings: { acceptUsdPayments: false, defaultExchangeRate: 17.25 },
    });

    expect(result.success).toBe(true);
    expect(result.synced).toBe(true);
    expect(query.maybeSingle).not.toHaveBeenCalled();
    expect(query.upsert).toHaveBeenCalledTimes(1);

    const payload = query.upsert.mock.calls[0][0];
    expect(payload.value_type).toBe("json");
    expect(payload.is_active).toBe(true);

    const persisted = JSON.parse(payload.setting_value);
    expect(persisted.acceptUsdPayments).toBe(false);
    expect(persisted.defaultExchangeRate).toBe(17.25);
  });

  it("escribe el cache local y reporta guardado parcial cuando falla la red", async () => {
    const query = buildQueryChain({
      data: null,
      error: null,
      upsertError: { message: "offline" },
    });
    supabase.from.mockReturnValue(query);

    const result = await persistCashOperationSettings({
      branchId: "branch-42",
      settings: { drawerCashLimit: 7777 },
    });

    expect(result.success).toBe(true);
    expect(result.partial).toBe(true);
    expect(result.synced).toBe(false);
    expect(result.error).toBe("offline");
    expect(result.drawerCashLimit).toBe(7777);

    const cached = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(cached.drawerCashLimit).toBe(7777);
    expect(getCashOperationSettings().drawerCashLimit).toBe(7777);
  });

  it("reporta fallo sin sucursal activa pero conserva la configuracion local", async () => {
    const result = await persistCashOperationSettings({
      branchId: null,
      settings: { defaultOpeningCash: 1500 },
    });

    expect(result.success).toBe(false);
    expect(result.synced).toBe(false);
    expect(result.error).toBeTruthy();
    expect(supabase.from).not.toHaveBeenCalled();
    expect(getCashOperationSettings().defaultOpeningCash).toBe(1500);
  });

  it("sanea y combina con la configuracion vigente antes de persistir", async () => {
    saveCashOperationSettings({
      defaultOpeningCash: 400,
      drawerCashLimit: 6000,
    });
    const query = buildQueryChain({ data: null, error: null });
    supabase.from.mockReturnValue(query);

    const result = await persistCashOperationSettings({
      branchId: "branch-42",
      settings: {
        drawerCashLimit: -1,
        cashDrawerTrigger: "invalid",
        defaultExchangeRate: "abc",
      },
    });

    expect(result.synced).toBe(true);
    expect(result.drawerCashLimit).toBe(0);
    expect(result.cashDrawerTrigger).toBe("cash_only");
    expect(result.defaultExchangeRate).toBe(18.5);
    expect(result.defaultOpeningCash).toBe(400);

    const payload = query.upsert.mock.calls[0][0];
    const persisted = JSON.parse(payload.setting_value);
    expect(persisted.defaultOpeningCash).toBe(400);
    expect(persisted.drawerCashLimit).toBe(0);
  });

  it("reporta fallo cuando el cache local no se puede escribir", async () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });

    try {
      const result = await persistCashOperationSettings({
        branchId: "branch-42",
        settings: { drawerCashLimit: 100 },
      });

      expect(result.success).toBe(false);
      expect(result.synced).toBe(false);
      expect(result.error).toBeTruthy();
      expect(supabase.from).not.toHaveBeenCalled();
    } finally {
      setItemSpy.mockRestore();
    }
  });
});
