export const REQUIRED_COLUMNS = [
  "Código",
  "Descripción",
  "Costo",
  "Precio",
  "Tipo venta",
  "Unidad",
  "Usa inventario",
  "IVA",
  "Es global",
];

export const OPTIONAL_COLUMNS = [
  "Departamento",
  "Stock inicial",
  "Stock mínimo",
  "Stock máximo",
  "Clave SAT",
];

export const DEPARTMENT_RULES = [
  "Si no capturas Departamento, el producto se guardará sin departamento.",
  "Si capturas un Departamento que no existe, se creará automáticamente en MAYÚSCULAS.",
];

export const ALLOWED_VALUES = [
  { field: "Tipo venta", values: "unidad, granel" },
  { field: "Unidad", values: "pieza, kg, g, l, ml, servicio" },
  { field: "Usa inventario", values: "sí/no, true/false o 1/0" },
  { field: "Es global", values: "sí/no, true/false o 1/0" },
  { field: "IVA", values: "0, 8 o 16" },
];

export const MAX_FILE_NOTE = "El archivo no debe exceder los 5MB.";
