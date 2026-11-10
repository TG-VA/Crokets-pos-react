import {
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
  SALE_TYPES,
  UNITS,
  IVA_VALUES,
} from "./importUtils";

export { REQUIRED_COLUMNS, OPTIONAL_COLUMNS };

const BOOLEAN_VALUES = "sí/no, true/false o 1/0";

const joinWithOr = (values) =>
  values.length > 1
    ? `${values.slice(0, -1).join(", ")} o ${values[values.length - 1]}`
    : values.join("");

export const DEPARTMENT_RULES = [
  "Si no capturas Departamento, el producto se guardará sin departamento.",
  "Si capturas un Departamento que no existe, se creará automáticamente en MAYÚSCULAS.",
];

export const ALLOWED_VALUES = [
  { field: "Tipo venta", values: SALE_TYPES.join(", ") },
  { field: "Unidad", values: UNITS.join(", ") },
  { field: "Usa inventario", values: BOOLEAN_VALUES },
  { field: "Es global", values: BOOLEAN_VALUES },
  { field: "IVA", values: joinWithOr(IVA_VALUES) },
];

export const MAX_FILE_NOTE = "El archivo no debe exceder los 5MB.";
