import { describe, it, expect } from "vitest";

import { TIME_ZONE, formatDate, formatTime, formatDateTime } from "./ticketDateFormatters";

describe("ticketDateFormatters", () => {
  it("usa el timezone America/Cancun", () => {
    expect(TIME_ZONE).toBe("America/Cancun");
  });

  describe("formatDate", () => {
    it("formatea en la zona de Cancun y no la de UTC", () => {
      expect(formatDate("2026-09-16T06:00:00.000Z")).toBe("16/9/2026");
      expect(formatDate("2026-09-16T02:00:00.000Z")).toBe("15/9/2026");
    });

    it("devuelve vacio para valores nulos o invalidos", () => {
      expect(formatDate(null)).toBe("");
      expect(formatDate(undefined)).toBe("");
      expect(formatDate("no-una-fecha")).toBe("");
    });
  });

  describe("formatTime", () => {
    it("formatea hora de 12 horas en la zona de Cancun", () => {
      expect(formatTime("2026-09-16T18:30:00.000Z")).toBe("01:30 p.m.");
      expect(formatTime("2026-09-16T10:00:00.000Z")).toBe("05:00 a.m.");
    });

    it("devuelve vacio para valores nulos o invalidos", () => {
      expect(formatTime(null)).toBe("");
      expect(formatTime("no-una-fecha")).toBe("");
    });
  });

  describe("formatDateTime", () => {
    it("combina fecha y hora", () => {
      expect(formatDateTime("2026-09-16T18:00:00.000Z")).toBe("16/9/2026 01:00 p.m.");
    });

    it("devuelve vacio para valores nulos o invalidos", () => {
      expect(formatDateTime(null)).toBe("");
      expect(formatDateTime("no-una-fecha")).toBe("");
    });
  });

  describe("entradas de produccion", () => {
    it("acepta instancias de Date (ruta de reimpresion)", () => {
      const date = new Date("2026-09-16T18:00:00.000Z");

      expect(formatDate(date)).toBe("16/9/2026");
      expect(formatTime(date)).toBe("01:00 p.m.");
      expect(formatDateTime(date)).toBe("16/9/2026 01:00 p.m.");
    });
  });
});
