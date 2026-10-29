import { describe, it, expect } from "vitest";

import {
  SALE_CLIENT_EXPIRY_MS,
  getClientExpiryRemainingMs,
  isSaleClientExpired,
} from "./salesClientExpiryService";

const ASSIGNED_AT = new Date("2026-01-01T10:00:00.000Z").getTime();

describe("salesClientExpiryService", () => {
  it("expone una vigencia de cinco minutos", () => {
    expect(SALE_CLIENT_EXPIRY_MS).toBe(5 * 60 * 1000);
  });

  it("conserva la asignacion justo antes de los cinco minutos", () => {
    const now = ASSIGNED_AT + SALE_CLIENT_EXPIRY_MS - 1;

    expect(isSaleClientExpired(ASSIGNED_AT, now)).toBe(false);
    expect(getClientExpiryRemainingMs(ASSIGNED_AT, now)).toBe(1);
  });

  it("expira la asignacion al cumplir los cinco minutos", () => {
    const now = ASSIGNED_AT + SALE_CLIENT_EXPIRY_MS;

    expect(isSaleClientExpired(ASSIGNED_AT, now)).toBe(true);
    expect(getClientExpiryRemainingMs(ASSIGNED_AT, now)).toBe(0);
  });

  it("mantiene el cliente expirado en instantes posteriores", () => {
    const now = ASSIGNED_AT + SALE_CLIENT_EXPIRY_MS * 3;

    expect(isSaleClientExpired(ASSIGNED_AT, now)).toBe(true);
    expect(getClientExpiryRemainingMs(ASSIGNED_AT, now)).toBe(0);
  });

  it("no considera expirada una asignacion sin fecha valida", () => {
    expect(isSaleClientExpired(null)).toBe(false);
    expect(isSaleClientExpired(0)).toBe(false);
    expect(isSaleClientExpired("abc")).toBe(false);
    expect(getClientExpiryRemainingMs(null)).toBe(0);
  });

  it("acepta una vigencia personalizada para pruebas", () => {
    expect(isSaleClientExpired(ASSIGNED_AT, ASSIGNED_AT + 500, 500)).toBe(true);
    expect(isSaleClientExpired(ASSIGNED_AT, ASSIGNED_AT + 499, 500)).toBe(
      false
    );
  });
});
