import { describe, expect, it } from "vitest";

import {
  createDateRange,
  getDateKeyFromValue,
  getDateRangeForPreset,
  getServerDateWindow,
  parseMovementDate,
} from "./movementDateUtils";

describe("getServerDateWindow", () => {
  it("ensancha el rango local un dia por lado y cierra el final exclusivo", () => {
    const window = getServerDateWindow("2026-02-10", "2026-02-12");

    expect(window).toEqual({
      startISO: new Date(2026, 1, 9).toISOString(),
      endISO: new Date(2026, 1, 14).toISOString(),
    });
  });

  it("normaliza un rango invertido", () => {
    expect(getServerDateWindow("2026-02-12", "2026-02-10")).toEqual(
      getServerDateWindow("2026-02-10", "2026-02-12")
    );
  });
});

describe("parseMovementDate", () => {
  it("promueve a UTC solo literales sin zona cuando se pide", () => {
    expect(
      parseMovementDate("2026-02-10 12:00:00", { assumeUtcNaive: true })
    ).toEqual(new Date("2026-02-10T12:00:00Z"));
    expect(
      parseMovementDate("2026-02-10T12:00:00-06:00", { assumeUtcNaive: true })
    ).toEqual(new Date("2026-02-10T18:00:00Z"));
    expect(parseMovementDate("")).toBeNull();
  });
});

describe("getDateKeyFromValue", () => {
  it("convierte la marca a dia en la zona del sistema", () => {
    const value = new Date(2026, 1, 10, 23, 30);

    expect(getDateKeyFromValue(value)).toBe("2026-02-10");
    expect(getDateKeyFromValue("no-fecha")).toBeNull();
  });
});

describe("createDateRange", () => {
  it("usa el inicio como fin cuando falta y ordena el rango", () => {
    expect(createDateRange("2026-02-10", "")).toMatchObject({
      startKey: "2026-02-10",
      endKey: "2026-02-10",
    });
    expect(createDateRange("2026-02-12", "2026-02-10")).toMatchObject({
      startKey: "2026-02-10",
      endKey: "2026-02-12",
    });
  });
});

describe("getDateRangeForPreset", () => {
  it("la semana va de lunes a domingo", () => {
    expect(getDateRangeForPreset("2026-02-15", "week")).toMatchObject({
      startKey: "2026-02-09",
      endKey: "2026-02-15",
    });
  });

  it("el mes cubre del primer al ultimo dia", () => {
    expect(getDateRangeForPreset("2028-02-10", "month")).toMatchObject({
      startKey: "2028-02-01",
      endKey: "2028-02-29",
    });
  });

  it("el dia es solo esa fecha", () => {
    expect(getDateRangeForPreset("2026-02-10")).toMatchObject({
      startKey: "2026-02-10",
      endKey: "2026-02-10",
    });
  });
});
