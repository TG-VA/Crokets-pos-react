import { describe, it, expect } from "vitest";

import {
  clampRangeToToday,
  filterTransfersByDateRange,
  getPresetRange,
} from "./transfersDateRange";

describe("transfersDateRange", () => {
  it("no muta la fecha de referencia recibida", () => {
    const referenceDate = new Date(2026, 9, 24, 15, 30, 0, 0);

    getPresetRange("today", referenceDate);
    getPresetRange("week", referenceDate);
    getPresetRange("month", referenceDate);

    expect(referenceDate).toEqual(new Date(2026, 9, 24, 15, 30, 0, 0));
  });

  it("devuelve el dia completo para el preset today", () => {
    const { dateFrom, dateTo } = getPresetRange(
      "today",
      new Date(2026, 9, 24, 20, 0, 0)
    );

    expect(dateFrom).toEqual(new Date(2026, 9, 24, 0, 0, 0, 0));
    expect(dateTo).toEqual(new Date(2026, 9, 24, 23, 59, 59, 999));
  });

  it("inicia la semana en lunes cuando la referencia es domingo", () => {
    const { dateFrom, dateTo } = getPresetRange(
      "week",
      new Date(2026, 9, 25, 12, 0, 0)
    );

    expect(dateFrom).toEqual(new Date(2026, 9, 19, 0, 0, 0, 0));
    expect(dateTo).toEqual(new Date(2026, 9, 25, 23, 59, 59, 999));
  });

  it("cubre la semana que cruza de mes", () => {
    const { dateFrom, dateTo } = getPresetRange(
      "week",
      new Date(2026, 9, 1, 9, 0, 0)
    );

    expect(dateFrom).toEqual(new Date(2026, 8, 28, 0, 0, 0, 0));
    expect(dateTo).toEqual(new Date(2026, 9, 4, 23, 59, 59, 999));
  });

  it("cierra el mes en el ultimo dia, incluido febrero bisiesto", () => {
    const february = getPresetRange("month", new Date(2028, 1, 15, 12, 0, 0));

    expect(february.dateFrom).toEqual(new Date(2028, 1, 1, 0, 0, 0, 0));
    expect(february.dateTo).toEqual(new Date(2028, 1, 29, 23, 59, 59, 999));

    const december = getPresetRange("month", new Date(2026, 11, 31, 12, 0, 0));

    expect(december.dateFrom).toEqual(new Date(2026, 11, 1, 0, 0, 0, 0));
    expect(december.dateTo).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
  });

  it("trata cualquier preset desconocido como today", () => {
    const { dateFrom, dateTo } = getPresetRange(
      "custom",
      new Date(2026, 9, 24, 8, 0, 0)
    );

    expect(dateFrom).toEqual(new Date(2026, 9, 24, 0, 0, 0, 0));
    expect(dateTo).toEqual(new Date(2026, 9, 24, 23, 59, 59, 999));
  });
});

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
