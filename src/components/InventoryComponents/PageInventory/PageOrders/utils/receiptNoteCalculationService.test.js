import { describe, it, expect } from "vitest";

import {
  RECEIPT_NOTE_MAX_LENGTH,
  RECEIPT_NOTE_WARNING_THRESHOLD,
  getReceiptNoteCounter,
  hasReceiptDifferences,
  normalizeReceiptNote,
  validateReceiptNote,
} from "./receiptNoteCalculationService";

const items = [
  { productId: "p1", productName: "Croqueta Cachorro 10kg", expectedQty: 5 },
  { productId: "p2", productName: "Shampoo Antipulgas", expectedQty: 2 },
];

describe("receiptNoteCalculationService", () => {
  it("detecta diferencias en el conteo fisico", () => {
    expect(hasReceiptDifferences(items, { p1: "4", p2: "2" })).toBe(true);
    expect(hasReceiptDifferences(items, { p1: "5", p2: "3" })).toBe(true);
    expect(hasReceiptDifferences(items, { p1: "5", p2: "2" })).toBe(false);
    expect(hasReceiptDifferences(items, { p1: "5" })).toBe(false);
    expect(hasReceiptDifferences([], {})).toBe(false);
  });

  it("normaliza la nota de recepcion y expone su maximo", () => {
    expect(RECEIPT_NOTE_MAX_LENGTH).toBe(500);
    expect(normalizeReceiptNote("  Llegó incompleto  ")).toBe(
      "Llegó incompleto"
    );
    expect(normalizeReceiptNote("   ")).toBe("");
    expect(normalizeReceiptNote(null)).toBe("");
  });

  it("calcula el contador y su tono segun la longitud", () => {
    expect(RECEIPT_NOTE_WARNING_THRESHOLD).toBe(450);
    expect(getReceiptNoteCounter("")).toMatchObject({
      length: 0,
      maxLength: RECEIPT_NOTE_MAX_LENGTH,
      text: "0 / 500",
      tone: "neutral",
    });
    expect(getReceiptNoteCounter(null).text).toBe("0 / 500");
    expect(getReceiptNoteCounter("a".repeat(449)).tone).toBe("neutral");
    expect(getReceiptNoteCounter("a".repeat(450)).tone).toBe("warning");
    expect(getReceiptNoteCounter("a".repeat(499)).tone).toBe("warning");
    expect(getReceiptNoteCounter("a".repeat(500))).toMatchObject({
      text: "500 / 500",
      tone: "error",
    });
  });

  it("no exige nota cuando el conteo coincide", () => {
    expect(
      validateReceiptNote({
        items,
        quantities: { p1: "5", p2: "2" },
        note: "",
      })
    ).toBe("");
  });

  it("exige nota no vacia cuando hay diferencias", () => {
    const quantities = { p1: "4", p2: "2" };

    expect(hasReceiptDifferences(items, quantities)).toBe(true);
    expect(validateReceiptNote({ items, quantities, note: "" })).toMatch(
      /obligatoria cuando hay diferencias/
    );
    expect(validateReceiptNote({ items, quantities, note: "   " })).toMatch(
      /obligatoria cuando hay diferencias/
    );
    expect(
      validateReceiptNote({ items, quantities, note: "  Faltó una bolsa  " })
    ).toBe("");
  });

  it("limita la longitud de la nota a 500 caracteres", () => {
    expect(
      validateReceiptNote({
        items,
        quantities: { p1: "5", p2: "2" },
        note: "a".repeat(RECEIPT_NOTE_MAX_LENGTH),
      })
    ).toBe("");
    expect(
      validateReceiptNote({
        items,
        quantities: { p1: "5", p2: "2" },
        note: "a".repeat(RECEIPT_NOTE_MAX_LENGTH + 1),
      })
    ).toMatch(/500 caracteres/);
  });
});
