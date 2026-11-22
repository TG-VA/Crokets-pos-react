const getTimestamp = (value) => {
  const time = new Date(value ?? "").getTime();

  return Number.isNaN(time) ? null : time;
};

/**
 * Ordena filas del mas reciente al mas antiguo por `dateKey`. Las fechas
 * nulas o invalidas van al final y el id desempata para que el orden sea
 * estable. Lo usan las lecturas paginadas por id, que llegan sin orden de fecha.
 */
export const sortByDateDesc = (rows, dateKey = "created_at") => {
  const normalizedRows = Array.isArray(rows) ? rows : [];

  return [...normalizedRows].sort((left, right) => {
    const leftTime = getTimestamp(left?.[dateKey]);

    const rightTime = getTimestamp(right?.[dateKey]);

    if (leftTime !== rightTime) {
      if (leftTime === null) {
        return 1;
      }

      if (rightTime === null) {
        return -1;
      }

      return rightTime - leftTime;
    }

    return String(right?.id ?? "").localeCompare(String(left?.id ?? ""));
  });
};
