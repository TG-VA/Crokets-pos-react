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
  cutToleranceAmount: 0,
  requireCutDifferenceNote: true,
  cashDrawerEnabled: false,
  cashDrawerTrigger: "cash_only",
  cashDrawerConnection: "printer_rj11",
};

const ALLOWED_TRIGGERS = ["cash_only", "all_sales"];

const ALLOWED_CONNECTIONS = ["printer_rj11", "manual"];

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

function getStoredSettings() {
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

export function getCashOperationSettings() {
  const stored = getStoredSettings();
  const merged = { ...DEFAULTS, ...(stored || {}) };

  const minOpeningCashEnabled = sanitizeBoolean(
    merged.minOpeningCashEnabled,
    DEFAULTS.minOpeningCashEnabled
  );
  const minOpeningCash = sanitizeNumber(
    merged.minOpeningCash,
    DEFAULTS.minOpeningCash,
    0
  );
  let allowZeroOpening = sanitizeBoolean(
    merged.allowZeroOpening,
    DEFAULTS.allowZeroOpening
  );
  if (minOpeningCashEnabled && minOpeningCash > 0) {
    allowZeroOpening = false;
  } else if (!minOpeningCashEnabled) {
    allowZeroOpening = true;
  }

  const settings = {
    defaultOpeningCash: sanitizeNumber(
      merged.defaultOpeningCash,
      DEFAULTS.defaultOpeningCash,
      0
    ),
    allowZeroOpening,
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
    blindCountCut: sanitizeBoolean(merged.blindCountCut, DEFAULTS.blindCountCut),
    cutToleranceAmount: sanitizeNumber(
      merged.cutToleranceAmount,
      DEFAULTS.cutToleranceAmount,
      0
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
  };

  return {
    success: true,
    ...settings,
    error: null,
  };
}

export function saveCashOperationSettings(partialSettings = {}) {
  try {
    const current = getCashOperationSettings();
    const next = { ...current, ...partialSettings };

    const minOpeningCashEnabled = sanitizeBoolean(
      next.minOpeningCashEnabled,
      DEFAULTS.minOpeningCashEnabled
    );
    const minOpeningCash = sanitizeNumber(
      next.minOpeningCash,
      DEFAULTS.minOpeningCash,
      0
    );
    let allowZeroOpening = sanitizeBoolean(
      next.allowZeroOpening,
      DEFAULTS.allowZeroOpening
    );
    if (minOpeningCashEnabled && minOpeningCash > 0) {
      allowZeroOpening = false;
    } else if (!minOpeningCashEnabled) {
      allowZeroOpening = true;
    }

    const toStore = {
      defaultOpeningCash: sanitizeNumber(
        next.defaultOpeningCash,
        DEFAULTS.defaultOpeningCash,
        0
      ),
      allowZeroOpening,
      maxOpeningCashEnabled: sanitizeBoolean(
        next.maxOpeningCashEnabled,
        DEFAULTS.maxOpeningCashEnabled
      ),
      minOpeningCashEnabled,
      minOpeningCash,
      drawerCashLimit: sanitizeNumber(
        next.drawerCashLimit,
        DEFAULTS.drawerCashLimit,
        0
      ),
      drawerAlertEnabled: sanitizeBoolean(
        next.drawerAlertEnabled,
        DEFAULTS.drawerAlertEnabled
      ),
      requireExitReason: sanitizeBoolean(
        next.requireExitReason,
        DEFAULTS.requireExitReason
      ),
      blindCountCut: sanitizeBoolean(next.blindCountCut, DEFAULTS.blindCountCut),
      cutToleranceAmount: sanitizeNumber(
        next.cutToleranceAmount,
        DEFAULTS.cutToleranceAmount,
        0
      ),
      requireCutDifferenceNote: sanitizeBoolean(
        next.requireCutDifferenceNote,
        DEFAULTS.requireCutDifferenceNote
      ),
      cashDrawerEnabled: sanitizeBoolean(
        next.cashDrawerEnabled,
        DEFAULTS.cashDrawerEnabled
      ),
      cashDrawerTrigger: sanitizeString(
        normalizeDrawerTrigger(next.cashDrawerTrigger),
        ALLOWED_TRIGGERS,
        DEFAULTS.cashDrawerTrigger
      ),
      cashDrawerConnection: sanitizeString(
        next.cashDrawerConnection,
        ALLOWED_CONNECTIONS,
        DEFAULTS.cashDrawerConnection
      ),
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));

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

export async function triggerCashDrawerKick() {
  try {
    if (window.electronAPI?.invoke) {
      const result = await window.electronAPI.invoke("open-cash-drawer");
      return {
        success: result?.success !== false,
        message: result?.message || "Pulso de apertura enviado al cajón de dinero.",
        error: result?.error || null,
      };
    }
    return {
      success: true,
      message: "Pulso de apertura enviado al cajón de dinero.",
      error: null,
    };
  } catch (error) {
    console.error("Error triggering cash drawer:", error);
    return {
      success: false,
      message: "No se pudo abrir el cajón de dinero.",
      error: error.message || "DRAWER_TRIGGER_FAILED",
    };
  }
}

export const DEFAULT_CASH_OPERATION_SETTINGS = DEFAULTS;
