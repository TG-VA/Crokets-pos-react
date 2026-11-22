export const KARDEX_ALL_TYPES_FILTER = "all";

/**
 * Opciones del filtro por tipo de movimiento. Cada opcion agrupa los
 * `movement_type` reales (y los historicos) que la vista rotula igual.
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
];

const TYPES_BY_FILTER_KEY = new Map(
  KARDEX_TYPE_FILTER_OPTIONS.map((option) => [
    option.key,
    new Set(option.types),
  ])
);

export const filterKardexRowsByType = (rows, filterKey) => {
  const normalizedRows = Array.isArray(rows) ? rows : [];

  const types = TYPES_BY_FILTER_KEY.get(filterKey);

  if (!types || types.size === 0) {
    return normalizedRows;
  }

  return normalizedRows.filter((row) =>
    types.has(
      String(row?.movement_type ?? "")
        .trim()
        .toLowerCase()
    )
  );
};
