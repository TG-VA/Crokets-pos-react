/**
 * cashOperationSettingsService.js
 * Configuracion operativa y financiera de caja por sucursal.
 *
 * La fuente de verdad remota es public.system_settings con
 * setting_key 'cash_operation_settings' (value_type 'json', unico por
 * setting_key + branch_id). En localStorage se conserva un cache local que
 * funciona como fallback offline y como capa de lectura sincrona para las
 * vistas criticas de cobro (PaymentModal, alertas de gaveta, apertura de
 * caja), de modo que la operacion nunca depende de la red.
 */

import { supabase } from "../lib/supabaseClient";
import { getSelectedPrinter } from "./printSettingsService";

export const CASH_OPERATION_SETTING_KEY = "cash_operation_settings";

const STORAGE_KEY = "cash_operation_settings";

const DEFAULTS = {
  defaultOpeningCash: 0,
  allowZeroOpening: true,
  maxOpeningCashEnabled: true,
  minOpeningCashEnabled: false,
  minOpeningCash: 0,
  drawerCashLimit: 0,
  drawerAlertEnabled: false,
  requireExitReason: true,
  blindCountCut: false,
  requireCutDifferenceNote: true,
  cashDrawerEnabled: false,
  cashDrawerTrigger: "cash_only",
  cashDrawerConnection: "printer_rj11",
  acceptUsdPayments: true,
  defaultExchangeRate: 18.5,
};

const ALLOWED_TRIGGERS = ["cash_only", "all_sales"];

const ALLOWED_CONNECTIONS = ["printer_rj11", "manual"];

const SETTING_COLUMNS = `
          id,
          setting_key,
          setting_value,
          value_type,
          description,
          branch_id,
          is_active,
          created_at,
          updated_at
        `;

const SETTING_DESCRIPTION =
  "Configuración operativa y financiera de caja por sucursal";

const OFFLINE_LOAD_MESSAGE =
  "No se pudo sincronizar la configuración de caja; se usaron los valores locales.";

const NO_BRANCH_MESSAGE =
  "No hay una sucursal activa para sincronizar la configuración de caja.";

function normalizeDrawerTrigger(value) {
  if (typeof value === "string" && value.trim() === "cash_and_movements") {
    return "cash_only";
  }
  return value;
}

function isValidNumber(value) {
  const num = Number(value);
  return Number.isFinite(num);
}

function sanitizeNumber(value, defaultValue, min = 0) {
  if (!isValidNumber(value)) {
    return Number(defaultValue);
  }
  const num = Number(value);
  if (num < min) {
    return Number(defaultValue);
  }
  return num;
}

function sanitizeBoolean(value, defaultValue) {
  if (typeof value === "boolean") {
    return value;
  }
  return Boolean(defaultValue);
}

function sanitizeString(value, allowed, defaultValue) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (allowed.includes(trimmed)) {
      return trimmed;
    }
  }
  return defaultValue;
}

/**
 * Deriva si se permite abrir caja con monto cero.
 *
 * Un fondo minimo obligatorio mayor a cero exige capturar efectivo, mientras
 * que con el minimo desactivado o en cero la apertura en cero sigue permitida.
 * Se resuelve aqui para que get, load y save compartan exactamente la misma regla.
 */
function deriveAllowZeroOpening(minOpeningCashEnabled, minOpeningCash) {
  if (!minOpeningCashEnabled) return true;
  return minOpeningCash <= 0;
}

/**
 * Normaliza cualquier fuente de valores (cache, remoto o parcial del formulario)
 * a un objeto de configuracion completo, tipado y dentro de sus limites.
 */
function sanitizeSettings(raw = {}) {
  const merged = { ...DEFAULTS, ...raw };

  const minOpeningCashEnabled = sanitizeBoolean(
    merged.minOpeningCashEnabled,
    DEFAULTS.minOpeningCashEnabled
  );
  const minOpeningCash = sanitizeNumber(
    merged.minOpeningCash,
    DEFAULTS.minOpeningCash,
    0
  );

  return {
    defaultOpeningCash: sanitizeNumber(
      merged.defaultOpeningCash,
      DEFAULTS.defaultOpeningCash,
      0
    ),
    allowZeroOpening: deriveAllowZeroOpening(
      minOpeningCashEnabled,
      minOpeningCash
    ),
    maxOpeningCashEnabled: sanitizeBoolean(
      merged.maxOpeningCashEnabled,
      DEFAULTS.maxOpeningCashEnabled
    ),
    minOpeningCashEnabled,
    minOpeningCash,
    drawerCashLimit: sanitizeNumber(
      merged.drawerCashLimit,
      DEFAULTS.drawerCashLimit,
      0
    ),
    drawerAlertEnabled: sanitizeBoolean(
      merged.drawerAlertEnabled,
      DEFAULTS.drawerAlertEnabled
    ),
    requireExitReason: sanitizeBoolean(
      merged.requireExitReason,
      DEFAULTS.requireExitReason
    ),
    blindCountCut: sanitizeBoolean(
      merged.blindCountCut,
      DEFAULTS.blindCountCut
    ),
    requireCutDifferenceNote: sanitizeBoolean(
      merged.requireCutDifferenceNote,
      DEFAULTS.requireCutDifferenceNote
    ),
    cashDrawerEnabled: sanitizeBoolean(
      merged.cashDrawerEnabled,
      DEFAULTS.cashDrawerEnabled
    ),
    cashDrawerTrigger: sanitizeString(
      normalizeDrawerTrigger(merged.cashDrawerTrigger),
      ALLOWED_TRIGGERS,
      DEFAULTS.cashDrawerTrigger
    ),
    cashDrawerConnection: sanitizeString(
      merged.cashDrawerConnection,
      ALLOWED_CONNECTIONS,
      DEFAULTS.cashDrawerConnection
    ),
    acceptUsdPayments: sanitizeBoolean(
      merged.acceptUsdPayments,
      DEFAULTS.acceptUsdPayments
    ),
    defaultExchangeRate: sanitizeNumber(
      merged.defaultExchangeRate,
      DEFAULTS.defaultExchangeRate,
      1
    ),
  };
}

function readCache() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch (error) {
    console.error("Error reading cash operation settings:", error);
    return null;
  }
}

function writeCache(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error("Error writing cash operation settings cache:", error);
    return false;
  }
}

function buildLocalResult(extra = {}) {
  return {
    success: true,
    ...getCashOperationSettings(),
    error: null,
    source: "cache",
    ...extra,
  };
}

/**
 * Lectura sincrona desde el cache local.
 *
 * Es la capa que consumen las vistas criticas de cobro: siempre responde con
 * valores saneados, nunca lanza y nunca espera a la red.
 */
export function getCashOperationSettings() {
  return {
    success: true,
    ...sanitizeSettings(readCache() || {}),
    error: null,
  };
}

/**
 * Escritura sincrona en el cache local.
 *
 * Es la primitiva cache-first: el POS guarda primero en la maquina y luego
 * el flujo remoto (persistCashOperationSettings) sincroniza con la sucursal.
 */
export function saveCashOperationSettings(partialSettings = {}) {
  try {
    const toStore = sanitizeSettings({
      ...getCashOperationSettings(),
      ...partialSettings,
    });

    const stored = writeCache(toStore);
    if (!stored) {
      return {
        success: false,
        error: "No se pudo escribir la configuración local de caja.",
      };
    }

    return {
      success: true,
      ...toStore,
      error: null,
    };
  } catch (error) {
    console.error("Error saving cash operation settings:", error);
    return {
      success: false,
      error: error.message || "Error saving cash operation settings",
    };
  }
}

function parseRemoteValue(settingValue) {
  if (typeof settingValue !== "string" || settingValue.trim() === "") {
    return null;
  }
  try {
    const parsed = JSON.parse(settingValue);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Hidratacion remota de la configuracion de una sucursal.
 *
 * Consulta system_settings y refresca el cache local para que todos los
 * consumidores sincronos vean los valores de la sucursal. Si Supabase falla,
 * responde con el cache (fallback offline) y lo indica en `error` y en
 * `source: "cache"`; si aun no existe registro remoto, conserva la
 * configuracion local para migrarla en el primer guardado.
 */
export async function loadCashOperationSettings({ branchId = null } = {}) {
  if (!branchId) {
    return buildLocalResult();
  }

  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select(SETTING_COLUMNS)
      .eq("setting_key", CASH_OPERATION_SETTING_KEY)
      .eq("branch_id", branchId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "Error loading cash operation settings from Supabase:",
        error
      );
      return buildLocalResult({ error: OFFLINE_LOAD_MESSAGE });
    }

    if (!data?.setting_value) {
      return buildLocalResult();
    }

    const parsed = parseRemoteValue(data.setting_value);
    if (!parsed) {
      console.error(
        "Invalid cash operation settings payload from Supabase:",
        CASH_OPERATION_SETTING_KEY
      );
      return buildLocalResult({ error: OFFLINE_LOAD_MESSAGE });
    }

    const settings = sanitizeSettings(parsed);
    writeCache(settings);

    return {
      success: true,
      ...settings,
      error: null,
      source: "remote",
    };
  } catch (error) {
    console.error("Error loading cash operation settings:", error);
    return buildLocalResult({ error: OFFLINE_LOAD_MESSAGE });
  }
}

/**
 * Persistencia de la configuracion de la sucursal.
 *
 * Orden cache-first: primero escribe el cache local (garantizando que la
 * apertura y el cobro sigan operando sin red) y despues sincroniza el
 * registro en system_settings con un upsert atomico sobre la restriccion
 * unica (setting_key, branch_id). El upsert evita el TOCTOU del select+insert
 * cuando dos terminales guardan por primera vez a la vez, y deja que Postgres
 * genere el id con su default (gen_random_uuid()).
 *
 * Si la sincronizacion remota falla, devuelve `success: true` con
 * `partial: true` y `synced: false` para que la interfaz reporte que los
 * cambios quedaron en esta maquina pero no en la sucursal.
 */
export async function persistCashOperationSettings({
  branchId = null,
  settings = {},
} = {}) {
  const localResult = saveCashOperationSettings(settings);
  if (!localResult.success) {
    return {
      success: false,
      partial: false,
      synced: false,
      error:
        localResult.error || "No se pudo guardar la configuración de caja.",
    };
  }

  const merged = sanitizeSettings(localResult);

  if (!branchId) {
    return {
      success: false,
      partial: false,
      synced: false,
      ...merged,
      error: NO_BRANCH_MESSAGE,
    };
  }

  try {
    const settingValue = JSON.stringify(merged);
    const now = new Date().toISOString();

    const { error: upsertError } = await supabase
      .from("system_settings")
      .upsert(
        {
          setting_key: CASH_OPERATION_SETTING_KEY,
          setting_value: settingValue,
          value_type: "json",
          description: SETTING_DESCRIPTION,
          branch_id: branchId,
          is_active: true,
          updated_at: now,
        },
        { onConflict: "setting_key,branch_id" }
      );

    if (upsertError) throw upsertError;

    return {
      success: true,
      partial: false,
      synced: true,
      ...merged,
      error: null,
    };
  } catch (error) {
    console.error("Error persisting cash operation settings:", error);
    return {
      success: true,
      partial: true,
      synced: false,
      ...merged,
      error: error.message || "No se pudo sincronizar con la sucursal.",
    };
  }
}

export async function triggerCashDrawerKick({ printerDeviceName, pin } = {}) {
  try {
    const resolvedPrinter =
      (typeof printerDeviceName === "string" && printerDeviceName.trim()) ||
      getSelectedPrinter() ||
      undefined;

    if (window.electronAPI?.invoke) {
      const result = await window.electronAPI.invoke("open-cash-drawer", {
        deviceName: resolvedPrinter,
        pin,
      });
      return {
        success: result?.success !== false,
        message:
          result?.message || "Pulso de apertura enviado al cajón de dinero.",
        error: result?.error || null,
        throttled: Boolean(result?.throttled),
      };
    }
    return {
      success: true,
      message: "Pulso de apertura enviado al cajón de dinero.",
      error: null,
      throttled: false,
    };
  } catch (error) {
    console.error("Error triggering cash drawer:", error);
    return {
      success: false,
      message: "No se pudo abrir el cajón de dinero.",
      error: error.message || "DRAWER_TRIGGER_FAILED",
      throttled: false,
    };
  }
}

export const DEFAULT_CASH_OPERATION_SETTINGS = DEFAULTS;
