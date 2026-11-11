// Filtrado del historial de traspasos por rango de fechas.
// Los presets y los limites del dia viven en el modulo compartido
// src/utils/dateRangePresets.js para reutilizarlos con Pedidos.

import { endOfDay, startOfDay } from "../../../../../utils/dateRangePresets";
import { parseTransferDate } from "./transfersFormatters";

export { getPresetRange } from "../../../../../utils/dateRangePresets";

/**
 * Evita que los presets de semana o mes dejen "Hasta" en una fecha futura,
 * que el DatePicker no puede seleccionar por su maxDate.
 */
export const clampRangeToToday = (
  { dateFrom, dateTo },
  referenceDate = new Date()
) => {
  const todayEnd = endOfDay(referenceDate);
  const exceedsToday = Boolean(dateTo && dateTo.getTime() > todayEnd.getTime());

  return {
    dateFrom,
    dateTo: exceedsToday ? todayEnd : dateTo,
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
