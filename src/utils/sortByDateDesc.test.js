import { describe, expect, it } from "vitest";

import { sortByDateDesc } from "./sortByDateDesc";

describe("sortByDateDesc", () => {
  it("ordena por fecha descendente, desempata por id y deja fechas invalidas al final", () => {
    const rows = [
      { id: "a", created_at: "2026-01-01T00:00:00Z" },
      { id: "b", created_at: null },
      { id: "c", created_at: "2026-01-03T00:00:00Z" },
      { id: "d", created_at: "2026-01-03T00:00:00Z" },
      { id: "e", created_at: "no-fecha" },
    ];

    expect(sortByDateDesc(rows).map((row) => row.id)).toEqual([
      "d",
      "c",
      "a",
      "e",
      "b",
    ]);
  });

  it("devuelve [] sin arreglo y no muta la entrada", () => {
    const rows = [{ id: "a" }];

    expect(sortByDateDesc(null)).toEqual([]);
    expect(sortByDateDesc(rows)).not.toBe(rows);
  });

  it("ordena por la columna de fecha indicada", () => {
    const rows = [
      { id: "a", sale_date: "2026-01-01T00:00:00Z" },
      { id: "b", sale_date: "2026-01-02T00:00:00Z" },
    ];

    expect(sortByDateDesc(rows, "sale_date").map((row) => row.id)).toEqual([
      "b",
      "a",
    ]);
  });
});
