import { describe, it, expect, beforeEach } from "vitest";
import {
  TICKET_WIDTH_OPTIONS,
  PRINT_MODE_AUTO,
  PRINT_MODE_CONFIRM,
  normalizeTicketWidth,
  getTicketWidthMm,
  saveTicketWidthMm,
  getTicketPrintProfile,
  normalizePrintMode,
  getPrintMode,
  savePrintMode,
} from "./printSettingsService";

describe("printSettingsService", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("expone únicamente los anchos soportados", () => {
    expect(TICKET_WIDTH_OPTIONS).toEqual([58, 80]);
  });

  it("normaliza anchos inválidos al valor por defecto de 58 mm", () => {
    expect(normalizeTicketWidth("80")).toBe(80);
    expect(normalizeTicketWidth(58)).toBe(58);
    expect(normalizeTicketWidth("abc")).toBe(58);
    expect(normalizeTicketWidth(null)).toBe(58);
    expect(normalizeTicketWidth(70)).toBe(58);
  });

  it("guarda y lee el ancho del ticket en localStorage", () => {
    expect(getTicketWidthMm()).toBe(58);

    const saved = saveTicketWidthMm(80);

    expect(saved).toEqual({ success: true, widthMm: 80, error: null });
    expect(getTicketWidthMm()).toBe(80);
    expect(getTicketPrintProfile()).toBe("80mm");
  });

  it("rechaza anchos no soportados sin modificar el valor guardado", () => {
    saveTicketWidthMm(80);

    const saved = saveTicketWidthMm(100);

    expect(saved.success).toBe(false);
    expect(saved.error).toBeTruthy();
    expect(saved.widthMm).toBe(80);
    expect(getTicketWidthMm()).toBe(80);
  });

  it("normaliza modos de impresión desconocidos a automático", () => {
    expect(normalizePrintMode(PRINT_MODE_CONFIRM)).toBe(PRINT_MODE_CONFIRM);
    expect(normalizePrintMode("siempre")).toBe(PRINT_MODE_AUTO);
    expect(normalizePrintMode(undefined)).toBe(PRINT_MODE_AUTO);
  });

  it("persiste el modo de impresión elegido", () => {
    expect(getPrintMode()).toBe(PRINT_MODE_AUTO);

    const saved = savePrintMode(PRINT_MODE_CONFIRM);

    expect(saved).toEqual({
      success: true,
      printMode: PRINT_MODE_CONFIRM,
      error: null,
    });
    expect(getPrintMode()).toBe(PRINT_MODE_CONFIRM);
  });
});
