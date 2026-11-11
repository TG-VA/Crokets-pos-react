import { describe, it, expect } from "vitest";

import { getPresetRange } from "../../../../../utils/dateRangePresets";
import {
  clampRangeToToday,
  filterTransfersByDateRange,
} from "./transfersDateRange";

describe("clampRangeToToday", () => {
  it("recorta el fin de semana y de mes a hoy", () => {
    const referenceDate = new Date(2026, 9, 21, 12, 0, 0);

    const week = clampRangeToToday(
      getPresetRange("week", referenceDate),
      referenceDate
    );
    expect(week.dateFrom).toEqual(new Date(2026, 9, 19, 0, 0, 0, 0));
    expect(week.dateTo).toEqual(new Date(2026, 9, 21, 23, 59, 59, 999));

    const month = clampRangeToToday(
      getPresetRange("month", referenceDate),
      referenceDate
    );
    expect(month.dateFrom).toEqual(new Date(2026, 9, 1, 0, 0, 0, 0));
    expect(month.dateTo).toEqual(new Date(2026, 9, 21, 23, 59, 59, 999));
  });

  it("no altera un rango que ya termina hoy o antes", () => {
    const referenceDate = new Date(2026, 9, 21, 12, 0, 0);

    const today = clampRangeToToday(
      getPresetRange("today", referenceDate),
      referenceDate
    );
    expect(today.dateTo).toEqual(new Date(2026, 9, 21, 23, 59, 59, 999));
  });
});

describe("filterTransfersByDateRange", () => {
  const buildOrder = (id, createdAt) => ({
    id,
    folio: `TR-${id}`,
    createdAt,
  });

  const history = [
    buildOrder("1", new Date(2026, 9, 20, 23, 59, 0).toISOString()),
    buildOrder("2", new Date(2026, 9, 21, 0, 0, 0).toISOString()),
    buildOrder("3", new Date(2026, 9, 21, 12, 0, 0).toISOString()),
    buildOrder("4", new Date(2026, 9, 21, 23, 59, 59).toISOString()),
    buildOrder("5", new Date(2026, 9, 22, 0, 0, 0).toISOString()),
  ];

  it("devuelve el historial sin cambios cuando no hay rango", () => {
    expect(filterTransfersByDateRange(history, null, null)).toBe(history);
  });

  it("incluye los extremos del dia en el rango", () => {
    const result = filterTransfersByDateRange(
      history,
      new Date(2026, 9, 21),
      new Date(2026, 9, 21)
    );

    expect(result.map((order) => order.id)).toEqual(["2", "3", "4"]);
  });

  it("incluye un traspaso de la manana cuando dateFrom trae hora", () => {
    const result = filterTransfersByDateRange(
      history,
      new Date(2026, 9, 21, 15, 0, 0),
      new Date(2026, 9, 21)
    );

    expect(result.map((order) => order.id)).toEqual(["2", "3", "4"]);
  });

  it("excluye traspasos sin fecha valida cuando hay rango", () => {
    const result = filterTransfersByDateRange(
      [...history, buildOrder("6", null)],
      new Date(2026, 9, 21),
      new Date(2026, 9, 21)
    );

    expect(result).toHaveLength(3);
  });

  it("acepta rango abierto con un solo extremo", () => {
    const fromOnly = filterTransfersByDateRange(
      history,
      new Date(2026, 9, 21),
      null
    );
    expect(fromOnly.map((order) => order.id)).toEqual(["2", "3", "4", "5"]);

    const toOnly = filterTransfersByDateRange(
      history,
      null,
      new Date(2026, 9, 21)
    );
    expect(toOnly.map((order) => order.id)).toEqual(["1", "2", "3", "4"]);
  });
});
