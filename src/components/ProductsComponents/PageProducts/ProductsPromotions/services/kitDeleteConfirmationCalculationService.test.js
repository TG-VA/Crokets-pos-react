import { describe, it, expect } from "vitest";
import {
  KIT_DELETE_CONFIRMATION_WORD,
  isDeleteConfirmationValid,
} from "./kitDeleteConfirmationCalculationService";

describe("isDeleteConfirmationValid", () => {
  it("acepta solo la palabra exacta", () => {
    expect(KIT_DELETE_CONFIRMATION_WORD).toBe("ELIMINAR");
    expect(isDeleteConfirmationValid("ELIMINAR")).toBe(true);
  });

  it("rechaza minusculas o mezcla", () => {
    expect(isDeleteConfirmationValid("eliminar")).toBe(false);
    expect(isDeleteConfirmationValid("Eliminar")).toBe(false);
  });

  it("rechaza espacios sobrantes", () => {
    expect(isDeleteConfirmationValid(" ELIMINAR")).toBe(false);
    expect(isDeleteConfirmationValid("ELIMINAR ")).toBe(false);
  });

  it("rechaza vacio y valores no texto", () => {
    expect(isDeleteConfirmationValid("")).toBe(false);
    expect(isDeleteConfirmationValid(null)).toBe(false);
    expect(isDeleteConfirmationValid(undefined)).toBe(false);
  });
});
