import { describe, it, expect } from "vitest";
import {
  ALLOWED_VALUES,
  BOOLEAN_PAIRS,
  MAX_FILE_NOTE,
  OPTIONAL_COLUMNS,
  REQUIRED_COLUMNS,
} from "./importInstructionsConfig";
import {
  REQUIRED_COLUMNS as VALIDATED_COLUMNS,
  OPTIONAL_COLUMNS as VALIDATED_OPTIONAL,
  MAX_FILE_SIZE_MB,
  SALE_TYPES,
  UNITS,
  parseBoolean,
} from "./importUtils";

const valuesOf = (field) =>
  ALLOWED_VALUES.find((item) => item.field === field).values;

describe("importInstructionsConfig", () => {
  it("usa las mismas columnas obligatorias que la validacion", () => {
    expect(REQUIRED_COLUMNS).toBe(VALIDATED_COLUMNS);
  });

  it("usa las mismas columnas opcionales que la validacion", () => {
    expect(OPTIONAL_COLUMNS).toBe(VALIDATED_OPTIONAL);
  });

  it("deriva los valores permitidos de las constantes de validacion", () => {
    expect(valuesOf("Tipo venta")).toBe(SALE_TYPES.join(", "));
    expect(valuesOf("Unidad")).toBe(UNITS.join(", "));
    expect(valuesOf("IVA")).toBe("0, 8 o 16");
  });

  it("muestra solo valores booleanos que parseBoolean acepta", () => {
    BOOLEAN_PAIRS.forEach(([truthy, falsy]) => {
      expect(parseBoolean(truthy)).toBe(true);
      expect(parseBoolean(falsy)).toBe(false);
    });
    expect(valuesOf("Usa inventario")).toBe("sí/no, true/false o 1/0");
    expect(valuesOf("Es global")).toBe(valuesOf("Usa inventario"));
  });

  it("construye la nota de tamano desde el limite de validacion", () => {
    expect(MAX_FILE_NOTE).toBe(
      `El archivo no debe exceder los ${MAX_FILE_SIZE_MB}MB.`
    );
    expect(MAX_FILE_NOTE).toBe("El archivo no debe exceder los 5MB.");
  });
});
