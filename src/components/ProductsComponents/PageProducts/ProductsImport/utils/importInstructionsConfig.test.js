import { describe, it, expect } from "vitest";
import { ALLOWED_VALUES, REQUIRED_COLUMNS } from "./importInstructionsConfig";
import {
  REQUIRED_COLUMNS as VALIDATED_COLUMNS,
  SALE_TYPES,
  UNITS,
} from "./importUtils";

const valuesOf = (field) =>
  ALLOWED_VALUES.find((item) => item.field === field).values;

describe("importInstructionsConfig", () => {
  it("usa las mismas columnas obligatorias que la validacion", () => {
    expect(REQUIRED_COLUMNS).toBe(VALIDATED_COLUMNS);
  });

  it("deriva los valores permitidos de las constantes de validacion", () => {
    expect(valuesOf("Tipo venta")).toBe(SALE_TYPES.join(", "));
    expect(valuesOf("Unidad")).toBe(UNITS.join(", "));
    expect(valuesOf("IVA")).toBe("0, 8 o 16");
  });
});
