import { describe, it, expect } from "vitest";
import {
  KIT_VALIDITY_STATUS,
  getKitValidityStatus,
  getTodayInTimezone,
  isKitAvailable,
  isKitExpiringSoon,
  validateKitDateRange,
} from "./kitValidityCalculationService";

const NOW = new Date("2026-11-10T12:00:00Z");

describe("getTodayInTimezone", () => {
  it("usa la fecha calendario de la zona horaria", () => {
    const lateUtc = new Date("2026-11-10T03:00:00Z");
    expect(getTodayInTimezone(lateUtc, "America/Cancun")).toBe("2026-11-09");
    expect(getTodayInTimezone(lateUtc, "UTC")).toBe("2026-11-10");
  });

  it("cae a la zona por defecto si la zona es invalida", () => {
    expect(getTodayInTimezone(NOW, "No/Existe")).toBe("2026-11-10");
  });
});

describe("getKitValidityStatus", () => {
  it("kit sin fechas y activo es vigente", () => {
    expect(getKitValidityStatus({ is_active: true }, { now: NOW })).toBe(
      KIT_VALIDITY_STATUS.ACTIVE
    );
  });

  it("kit desactivado es inactivo aunque sus fechas lo cubran", () => {
    const kit = {
      is_active: false,
      starts_on: "2026-11-01",
      ends_on: "2026-11-30",
    };
    expect(getKitValidityStatus(kit, { now: NOW })).toBe(
      KIT_VALIDITY_STATUS.INACTIVE
    );
  });

  it("antes del inicio es programado", () => {
    const kit = { is_active: true, starts_on: "2026-11-11" };
    expect(getKitValidityStatus(kit, { now: NOW })).toBe(
      KIT_VALIDITY_STATUS.SCHEDULED
    );
  });

  it("despues del fin es vencido", () => {
    const kit = { is_active: true, ends_on: "2026-11-09" };
    expect(getKitValidityStatus(kit, { now: NOW })).toBe(
      KIT_VALIDITY_STATUS.EXPIRED
    );
  });

  it("los limites son inclusivos", () => {
    const kit = {
      is_active: true,
      starts_on: "2026-11-10",
      ends_on: "2026-11-10",
    };
    expect(isKitAvailable(kit, { now: NOW })).toBe(true);
  });

  it("acepta timestamps y descarta fechas con formato invalido", () => {
    expect(
      getKitValidityStatus(
        { is_active: true, ends_on: "2026-11-09T00:00:00Z" },
        { now: NOW }
      )
    ).toBe(KIT_VALIDITY_STATUS.EXPIRED);
    expect(
      getKitValidityStatus({ is_active: true, ends_on: "basura" }, { now: NOW })
    ).toBe(KIT_VALIDITY_STATUS.ACTIVE);
  });

  it("no lanza con kit nulo", () => {
    expect(getKitValidityStatus(null)).toBe(KIT_VALIDITY_STATUS.INACTIVE);
  });
});

describe("validateKitDateRange", () => {
  it("acepta rangos vacios, parciales y ordenados", () => {
    expect(validateKitDateRange("", "")).toBeNull();
    expect(validateKitDateRange("2026-11-01", "")).toBeNull();
    expect(validateKitDateRange("2026-11-01", "2026-11-01")).toBeNull();
  });

  it("rechaza fin anterior al inicio", () => {
    expect(validateKitDateRange("2026-11-10", "2026-11-09")).toMatch(
      /anterior/
    );
  });

  it("rechaza fechas con formato invalido", () => {
    expect(validateKitDateRange("10/11/2026", "")).toMatch(/inicio/);
    expect(validateKitDateRange("", "x")).toMatch(/fin/);
  });
});

describe("isKitExpiringSoon", () => {
  const TODAY = "2026-11-10";
  const kit = (ends_on, extra = {}) => ({ is_active: true, ends_on, ...extra });

  it("marca kits que vencen dentro del umbral, inclusive", () => {
    expect(isKitExpiringSoon(kit("2026-11-10"), TODAY)).toBe(true);
    expect(isKitExpiringSoon(kit("2026-11-13"), TODAY)).toBe(true);
  });

  it("no marca kits que vencen despues del umbral", () => {
    expect(isKitExpiringSoon(kit("2026-11-14"), TODAY)).toBe(false);
  });

  it("respeta un umbral personalizado", () => {
    expect(isKitExpiringSoon(kit("2026-11-14"), TODAY, 7)).toBe(true);
  });

  it("no considera vencidos ni kits sin fecha de fin", () => {
    expect(isKitExpiringSoon(kit("2026-11-09"), TODAY)).toBe(false);
    expect(isKitExpiringSoon(kit(null), TODAY)).toBe(false);
  });

  it("no considera kits inactivos ni programados", () => {
    expect(
      isKitExpiringSoon(kit("2026-11-12", { is_active: false }), TODAY)
    ).toBe(false);
    expect(
      isKitExpiringSoon(kit("2026-11-12", { starts_on: "2026-11-11" }), TODAY)
    ).toBe(false);
  });
});
