export const KARDEX_ALL_TYPES_FILTER = "all";
export const KARDEX_OTHER_TYPES_FILTER = "other";

/**
 * Opciones del filtro por tipo de movimiento. Cada opcion agrupa los
 * `movement_type` reales (y los historicos) que la vista rotula igual.
 * "Otros" agrupa los tipos que ninguna otra opcion lista (canjes,
 * activaciones de inventario, cambios de catalogo, etc.).
 */
export const KARDEX_TYPE_FILTER_OPTIONS = [
  { key: KARDEX_ALL_TYPES_FILTER, label: "Todos", types: [] },
  { key: "sale", label: "Venta", types: ["sale"] },
  { key: "return", label: "Devolución", types: ["return"] },
  { key: "canceled", label: "Cancelación", types: ["canceled", "cancelled"] },
  { key: "adjustment", label: "Ajuste", types: ["adjustment"] },
  {
    key: "entry",
    label: "Entrada / compra",
    types: ["entry", "purchase", "inventory_add"],
  },
  {
    key: "transfer",
    label: "Traspaso",
    types: ["transfer", "transfer_in", "transfer_out"],
  },
  { key: KARDEX_OTHER_TYPES_FILTER, label: "Otros", types: [] },
];

const TYPES_BY_FILTER_KEY = new Map(
  KARDEX_TYPE_FILTER_OPTIONS.map((option) => [
    option.key,
    new Set(option.types),
  ])
);

const LISTED_TYPES = new Set(
  KARDEX_TYPE_FILTER_OPTIONS.flatMap((option) => option.types)
);

const normalizeMovementType = (row) =>
  String(row?.movement_type ?? "")
    .trim()
    .toLowerCase();

export const filterKardexRowsByType = (rows, filterKey) => {
  const normalizedRows = Array.isArray(rows) ? rows : [];

  if (filterKey === KARDEX_OTHER_TYPES_FILTER) {
    return normalizedRows.filter(
      (row) => !LISTED_TYPES.has(normalizeMovementType(row))
    );
  }

  const types = TYPES_BY_FILTER_KEY.get(filterKey);

  if (!types || types.size === 0) {
    return normalizedRows;
  }

  return normalizedRows.filter((row) => types.has(normalizeMovementType(row)));
};
