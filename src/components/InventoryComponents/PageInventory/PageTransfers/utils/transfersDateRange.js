// Rangos de fecha local (hoy, semana, mes) y filtrado del historial de traspasos.

import { parseTransferDate } from "./transfersFormatters";

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

/**
 * Rango local (lunes a domingo) para los presets del historial de traspasos.
 * Se usa la hora local del equipo para que el filtro coincida con la fecha
 * que el usuario ve en la tabla.
 */
export const getPresetRange = (preset, referenceDate = new Date()) => {
  if (preset === "week") {
    const dateFrom = startOfDay(referenceDate);
    const weekdayOffset = (dateFrom.getDay() + 6) % 7;

    dateFrom.setDate(dateFrom.getDate() - weekdayOffset);

    const dateTo = endOfDay(dateFrom);
    dateTo.setDate(dateTo.getDate() + 6);

    return { dateFrom, dateTo };
  }

  if (preset === "month") {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();

    return {
      dateFrom: new Date(year, month, 1, 0, 0, 0, 0),
      dateTo: new Date(year, month + 1, 0, 23, 59, 59, 999),
    };
  }

  return {
    dateFrom: startOfDay(referenceDate),
    dateTo: endOfDay(referenceDate),
  };
};

/**
 * Evita que los presets de semana o mes dejen "Hasta" en una fecha futura,
 * que el DatePicker no puede seleccionar por su maxDate.
 */
export const clampRangeToToday = (
  { dateFrom, dateTo },
  referenceDate = new Date()
) => {
  const todayEnd = endOfDay(referenceDate);

  return {
    dateFrom,
    dateTo: dateTo && dateTo > todayEnd ? todayEnd : dateTo,
  };
};

const isWithinRange = (date, dateFrom, dateTo) => {
  if (!date) return false;

  if (dateFrom && date < startOfDay(dateFrom)) return false;
  if (dateTo && date > endOfDay(dateTo)) return false;

  return true;
};

export const filterTransfersByDateRange = (
  orders = [],
  dateFrom = null,
  dateTo = null
) => {
  const list = Array.isArray(orders) ? orders : [];

  if (!dateFrom && !dateTo) {
    return list;
  }

  return list.filter((order) =>
    isWithinRange(parseTransferDate(order?.createdAt), dateFrom, dateTo)
  );
};
