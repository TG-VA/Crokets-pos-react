import { describe, expect, it } from "vitest";

import { sortRowsBy } from "./sortRows";

const ids = (rows) => rows.map((row) => row.id);

describe("sortRowsBy", () => {
  it("ordena fechas de segundo exacto antes que las fracciones del mismo segundo", () => {
    const rows = [
      { id: "a", created_at: "2026-11-21T10:00:00.12+00:00" },
      { id: "b", created_at: "2026-11-21T10:00:00+00:00" },
    ];

    expect(ids(sortRowsBy(rows, "created_at", { type: "date" }))).toEqual([
      "b",
      "a",
    ]);
    expect(
      ids(sortRowsBy(rows, "created_at", { type: "date", ascending: false }))
    ).toEqual(["a", "b"]);
  });

  it("desempata por id ascendente en ambas direcciones", () => {
    const rows = [
      { id: "c", name: "X" },
      { id: "a", name: "X" },
      { id: "b", name: "A" },
    ];

    expect(ids(sortRowsBy(rows, "name"))).toEqual(["b", "a", "c"]);
    expect(ids(sortRowsBy(rows, "name", { ascending: false }))).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("no muta la entrada y tolera null", () => {
    const rows = [{ id: "b" }, { id: "a" }];
    sortRowsBy(rows, "created_at", { type: "date" });
    expect(ids(rows)).toEqual(["b", "a"]);
    expect(sortRowsBy(null, "name")).toEqual([]);
  });
});
