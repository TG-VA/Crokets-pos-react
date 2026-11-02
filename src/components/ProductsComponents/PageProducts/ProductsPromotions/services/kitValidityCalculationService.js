export const DEFAULT_KIT_TIMEZONE = "America/Cancun";

export const KIT_VALIDITY_STATUS = {
  ACTIVE: "active",
  SCHEDULED: "scheduled",
  EXPIRED: "expired",
  INACTIVE: "inactive",
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidTimezone = (timezone) => {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

/**
 * Devuelve la fecha calendario (YYYY-MM-DD) de `now` en la zona horaria dada.
 * Una zona invalida cae a la zona por defecto para no lanzar excepciones.
 */
export const getTodayInTimezone = (
  now = new Date(),
  timezone = DEFAULT_KIT_TIMEZONE
) => {
  const zone = isValidTimezone(timezone) ? timezone : DEFAULT_KIT_TIMEZONE;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
};

const normalizeDateOnly = (value) => {
  if (typeof value !== "string") return null;
  const candidate = value.slice(0, 10);
  return DATE_ONLY_PATTERN.test(candidate) ? candidate : null;
};

/**
 * Estado de vigencia de un kit. Las fechas son inclusivas y opcionales
 * (null significa sin limite). Un kit desactivado manualmente es siempre
 * "inactive", sin importar sus fechas.
 */
export const getKitValidityStatus = (
  kit,
  { now = new Date(), timezone = DEFAULT_KIT_TIMEZONE } = {}
) => {
  if (!kit?.is_active) return KIT_VALIDITY_STATUS.INACTIVE;

  const today = getTodayInTimezone(now, timezone);
  const startsOn = normalizeDateOnly(kit.starts_on);
  const endsOn = normalizeDateOnly(kit.ends_on);

  if (startsOn && today < startsOn) return KIT_VALIDITY_STATUS.SCHEDULED;
  if (endsOn && today > endsOn) return KIT_VALIDITY_STATUS.EXPIRED;
  return KIT_VALIDITY_STATUS.ACTIVE;
};

export const isKitAvailable = (kit, options) =>
  getKitValidityStatus(kit, options) === KIT_VALIDITY_STATUS.ACTIVE;

const addDaysToDateOnly = (dateOnly, days) => {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
};

/**
 * Indica si un kit activo y ya iniciado vence dentro de `days` dias (inclusive,
 * contando hoy). `today` es una fecha YYYY-MM-DD inyectada por el llamador.
 */
export const isKitExpiringSoon = (kit, today, days = 3) => {
  const todayDate = normalizeDateOnly(today);
  const endsOn = normalizeDateOnly(kit?.ends_on);
  if (!kit?.is_active || !todayDate || !endsOn) return false;

  const startsOn = normalizeDateOnly(kit.starts_on);
  if (startsOn && todayDate < startsOn) return false;

  return endsOn >= todayDate && endsOn <= addDaysToDateOnly(todayDate, days);
};

/**
 * Valida el rango capturado en el formulario. Devuelve un mensaje de error
 * o null cuando el rango es valido o esta vacio.
 */
export const validateKitDateRange = (startsOn, endsOn) => {
  const start = normalizeDateOnly(startsOn);
  const end = normalizeDateOnly(endsOn);
  if (startsOn && !start) return "La fecha de inicio no es válida.";
  if (endsOn && !end) return "La fecha de fin no es válida.";
  if (start && end && end < start) {
    return "La fecha de fin no puede ser anterior a la fecha de inicio.";
  }
  return null;
};
