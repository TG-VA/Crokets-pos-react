/*
  fetchAllPages devuelve las filas ordenadas por el cursor (id); el orden de
  negocio se aplica en memoria con este helper. Desempata siempre por id
  ascendente para que el resultado sea determinista.
*/

const compareIds = (left, right) =>
  String(left.id).localeCompare(String(right.id));

// Un timestamp de segundo exacto ("10:00:00+00:00") y otro con fraccion
// ("10:00:00.12+00:00") no se ordenan bien como texto; se comparan como fecha.
const toTime = (value) => {
  const time = Date.parse(value ?? "");
  return Number.isNaN(time) ? -Infinity : time;
};

const COMPARATORS = {
  date: (left, right) => toTime(left) - toTime(right),
  text: (left, right) => String(left ?? "").localeCompare(String(right ?? "")),
};

/**
 * Devuelve una copia de `rows` ordenada por `column`.
 * @param {Array<object>|null|undefined} rows
 * @param {string} column
 * @param {{ ascending?: boolean, type?: "date" | "text" }} [options]
 * @returns {Array<object>}
 */
export const sortRowsBy = (
  rows,
  column,
  { ascending = true, type = "text" } = {}
) => {
  const compare = COMPARATORS[type] || COMPARATORS.text;
  const direction = ascending ? 1 : -1;
  return [...(rows || [])].sort(
    (left, right) =>
      direction * compare(left[column], right[column]) ||
      compareIds(left, right)
  );
};
