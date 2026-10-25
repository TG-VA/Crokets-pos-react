import { describe, it, expect } from "vitest";

import { getPresetRange } from "./ordersDateRange";

describe("ordersDateRange", () => {
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
