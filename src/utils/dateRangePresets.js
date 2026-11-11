// Presets de rango de fecha local compartidos por Pedidos y Traspasos.

export const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

/**
<<<<<<< HEAD:src/components/InventoryComponents/PageInventory/PageOrders/utils/ordersDateRange.js
 * Rango local para los presets de pedidos: semana (lunes a domingo), quincena
 * (1 al 15 o 16 al fin de mes) y mes.
=======
 * Rango local (lunes a domingo) para los presets de historial.
>>>>>>> 9ddb363 (refactor(fechas): comparte presets de rango entre pedidos y traspasos):src/utils/dateRangePresets.js
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

  if (preset === "fortnight") {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const isFirstHalf = referenceDate.getDate() <= 15;

    return {
      dateFrom: new Date(year, month, isFirstHalf ? 1 : 16, 0, 0, 0, 0),
      dateTo: isFirstHalf
        ? new Date(year, month, 15, 23, 59, 59, 999)
        : new Date(year, month + 1, 0, 23, 59, 59, 999),
    };
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
