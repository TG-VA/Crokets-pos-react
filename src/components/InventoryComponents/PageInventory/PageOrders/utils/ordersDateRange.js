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
 * Rango local (lunes a domingo) para los presets del historial de pedidos.
 * Las fechas se calculan con la hora local del equipo para que el filtro
 * coincida con la fecha que el usuario ve en la tabla.
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
