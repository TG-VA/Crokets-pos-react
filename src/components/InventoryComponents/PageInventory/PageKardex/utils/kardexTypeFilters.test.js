import { describe, expect, it } from "vitest";

import {
  KARDEX_ALL_TYPES_FILTER,
  KARDEX_OTHER_TYPES_FILTER,
  KARDEX_TYPE_FILTER_OPTIONS,
  filterKardexRowsByType,
} from "./kardexTypeFilters";

const rows = [
  { id: 1, movement_type: "sale" },
  { id: 2, movement_type: "transfer_out" },
  { id: 3, movement_type: "CANCELLED" },
  { id: 4, movement_type: "purchase" },
  { id: 5, movement_type: "redemption" },
  { id: 6, movement_type: "product_update" },
];

const ids = (result) => result.map((row) => row.id);

describe("filterKardexRowsByType", () => {
  it("devuelve todas las filas con el filtro general o desconocido", () => {
    expect(filterKardexRowsByType(rows, KARDEX_ALL_TYPES_FILTER)).toBe(rows);
    expect(filterKardexRowsByType(rows, "nope")).toBe(rows);
  });

  it("agrupa los tipos equivalentes de cada opcion", () => {
    expect(ids(filterKardexRowsByType(rows, "transfer"))).toEqual([2]);
    expect(ids(filterKardexRowsByType(rows, "canceled"))).toEqual([3]);
    expect(ids(filterKardexRowsByType(rows, "entry"))).toEqual([4]);
  });

  it("el filtro Otros conserva solo los tipos que ninguna opcion lista", () => {
    expect(
      ids(filterKardexRowsByType(rows, KARDEX_OTHER_TYPES_FILTER))
    ).toEqual([5, 6]);
  });

  it("tolera filas no tabulares", () => {
    expect(filterKardexRowsByType(null, "sale")).toEqual([]);
  });

  it("cada opcion tiene clave unica", () => {
    const keys = KARDEX_TYPE_FILTER_OPTIONS.map((option) => option.key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});
