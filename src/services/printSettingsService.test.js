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
  getSelectedPrinter,
  saveSelectedPrinter,
  getTicketCopies,
  saveTicketCopies,
  getTicketFeedLines,
  saveTicketFeedLines,
  sanitizeNumericText,
  TICKET_COPIES_RANGE,
  TICKET_FEED_LINES_RANGE,
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

  it("persiste y recupera la impresora seleccionada", () => {
    expect(getSelectedPrinter()).toBe("");
    expect(saveSelectedPrinter("POS-80")).toBe(true);
    expect(getSelectedPrinter()).toBe("POS-80");
    saveSelectedPrinter("");
    expect(getSelectedPrinter()).toBe("");
  });

  it("gestiona el número de copias acotándolo entre 1 y 10", () => {
    expect(getTicketCopies()).toBe(1);

    const saved = saveTicketCopies(3);
    expect(saved).toEqual({ success: true, copies: 3 });
    expect(getTicketCopies()).toBe(3);

    // Mayor a 10 se acota a 10
    const clampedMax = saveTicketCopies(40);
    expect(clampedMax).toEqual({ success: true, copies: 10 });
    expect(getTicketCopies()).toBe(10);

    // Menor a 1 se acota a 1
    const clampedMin = saveTicketCopies(0);
    expect(clampedMin).toEqual({ success: true, copies: 1 });
    expect(getTicketCopies()).toBe(1);

    // No numérico se normaliza a 1
    const invalid = saveTicketCopies("abc");
    expect(invalid).toEqual({ success: true, copies: 1 });

    // Cadena vacía se normaliza a 1
    const empty = saveTicketCopies("");
    expect(empty).toEqual({ success: true, copies: 1 });
  });

  it("trunca fracciones y evita que un valor < 1 persista como 0 en copias", () => {
    const fractional = saveTicketCopies(0.5);
    expect(fractional).toEqual({ success: true, copies: 1 });
    expect(getTicketCopies()).toBe(1);

    const nearOne = saveTicketCopies(1.9);
    expect(nearOne).toEqual({ success: true, copies: 1 });
    expect(getTicketCopies()).toBe(1);

    const validFraction = saveTicketCopies(3.7);
    expect(validFraction).toEqual({ success: true, copies: 3 });
    expect(getTicketCopies()).toBe(3);

    const negative = saveTicketCopies(-2);
    expect(negative).toEqual({ success: true, copies: 1 });
    expect(getTicketCopies()).toBe(1);
  });

  it("gestiona los saltos de línea de corte acotándolos entre 0 y 25 con default 2", () => {
    expect(getTicketFeedLines()).toBe(2);

    const saved = saveTicketFeedLines(4);
    expect(saved).toEqual({ success: true, feedLines: 4 });
    expect(getTicketFeedLines()).toBe(4);

    // Mayor a 25 se acota a 25
    const clampedMax = saveTicketFeedLines(30);
    expect(clampedMax).toEqual({ success: true, feedLines: 25 });
    expect(getTicketFeedLines()).toBe(25);

    // 0 es un valor válido (corte a ras del cabezal)
    const zero = saveTicketFeedLines(0);
    expect(zero).toEqual({ success: true, feedLines: 0 });
    expect(getTicketFeedLines()).toBe(0);

    // Negativo cae al default 2
    const negative = saveTicketFeedLines(-1);
    expect(negative).toEqual({ success: true, feedLines: 2 });
    expect(getTicketFeedLines()).toBe(2);

    // Cadena vacía cae al default 2
    const empty = saveTicketFeedLines("");
    expect(empty).toEqual({ success: true, feedLines: 2 });
    expect(getTicketFeedLines()).toBe(2);
  });

  it("trunca fracciones y normaliza entradas no numéricas en saltos de línea", () => {
    // 0.5 trunca a 0, que es un valor válido dentro del rango
    const fractional = saveTicketFeedLines(0.5);
    expect(fractional).toEqual({ success: true, feedLines: 0 });
    expect(getTicketFeedLines()).toBe(0);

    const nearOne = saveTicketFeedLines(1.4);
    expect(nearOne).toEqual({ success: true, feedLines: 1 });
    expect(getTicketFeedLines()).toBe(1);

    const validFraction = saveTicketFeedLines(4.4);
    expect(validFraction).toEqual({ success: true, feedLines: 4 });
    expect(getTicketFeedLines()).toBe(4);

    const notNumeric = saveTicketFeedLines("abc");
    expect(notNumeric).toEqual({ success: true, feedLines: 2 });
    expect(getTicketFeedLines()).toBe(2);
  });

  it("mantiene la compatibilidad con valores previos fuera del nuevo rango", () => {
    window.localStorage.setItem("settings_ticket_copies", "7");
    window.localStorage.setItem("settings_ticket_feed_lines", "5");
    expect(getTicketCopies()).toBe(7);
    expect(getTicketFeedLines()).toBe(5);

    window.localStorage.setItem("settings_ticket_copies", "99");
    window.localStorage.setItem("settings_ticket_feed_lines", "50");
    expect(getTicketCopies()).toBe(10);
    expect(getTicketFeedLines()).toBe(25);
  });

  it("sanea la entrada numerica conservando la cadena vacia y acotando al maximo", () => {
    expect(sanitizeNumericText("", TICKET_COPIES_RANGE)).toBe("");
    expect(sanitizeNumericText(null, TICKET_COPIES_RANGE)).toBe("");
    expect(sanitizeNumericText("4a2", TICKET_COPIES_RANGE)).toBe("10");
    expect(sanitizeNumericText("a2", TICKET_COPIES_RANGE)).toBe("2");
    expect(sanitizeNumericText("11", TICKET_COPIES_RANGE)).toBe("10");
    expect(sanitizeNumericText("100", TICKET_COPIES_RANGE)).toBe("10");
    expect(sanitizeNumericText("10", TICKET_COPIES_RANGE)).toBe("10");
    expect(sanitizeNumericText("0", TICKET_COPIES_RANGE)).toBe("0");
  });

  it("acota los saltos de linea a 25 al sanear la entrada numerica", () => {
    expect(sanitizeNumericText("", TICKET_FEED_LINES_RANGE)).toBe("");
    expect(sanitizeNumericText("2a5", TICKET_FEED_LINES_RANGE)).toBe("25");
    expect(sanitizeNumericText("26", TICKET_FEED_LINES_RANGE)).toBe("25");
    expect(sanitizeNumericText("300", TICKET_FEED_LINES_RANGE)).toBe("25");
    expect(sanitizeNumericText("25", TICKET_FEED_LINES_RANGE)).toBe("25");
    expect(sanitizeNumericText("0", TICKET_FEED_LINES_RANGE)).toBe("0");
  });
});
