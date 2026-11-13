import {
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
  SALE_TYPES,
  UNITS,
  IVA_VALUES,
  MAX_FILE_SIZE_MESSAGE,
} from "./importUtils";

export { REQUIRED_COLUMNS, OPTIONAL_COLUMNS };

// Subconjunto intencional de lo que acepta parseBoolean (tambien acepta yes/y/n).
export const BOOLEAN_PAIRS = [
  ["sí", "no"],
  ["true", "false"],
  ["1", "0"],
];

const joinWithOr = (values) =>
  values.length > 1
    ? `${values.slice(0, -1).join(", ")} o ${values[values.length - 1]}`
    : values.join("");

const BOOLEAN_VALUES = joinWithOr(BOOLEAN_PAIRS.map((pair) => pair.join("/")));

export const DEPARTMENT_RULES = [
  "Si no capturas Departamento, el producto se guardará sin departamento.",
  "Si capturas un Departamento que no existe, se creará automáticamente en MAYÚSCULAS.",
  "Si capturas un Departamento inactivo, el producto se creará inactivo.",
];

export const ALLOWED_VALUES = [
  { field: "Tipo venta", values: SALE_TYPES.join(", ") },
  { field: "Unidad", values: UNITS.join(", ") },
  { field: "Usa inventario", values: BOOLEAN_VALUES },
  { field: "Es global", values: BOOLEAN_VALUES },
  { field: "IVA", values: joinWithOr(IVA_VALUES) },
];

export const MAX_FILE_NOTE = MAX_FILE_SIZE_MESSAGE;
