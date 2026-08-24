import * as XLSX from "xlsx";

export const REQUIRED_COLUMNS = ["Código", "Descripción", "Costo", "Precio", "Tipo venta", "Unidad", "Usa inventario", "IVA", "Es global"];
export const OPTIONAL_COLUMNS = ["Departamento", "Stock inicial", "Stock mínimo", "Stock máximo", "Clave SAT"];
export const TEMPLATE_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

export const SALE_TYPES = ["unidad", "granel"];
export const UNITS = ["pieza", "kg", "g", "l", "ml", "servicio"];
export const IVA_VALUES = [0, 8, 16];

export const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const normalizeHeader = (value) => normalizeText(value).replace(/\s+/g, " ");

export const parseBoolean = (value) => {
  const normalized = normalizeText(value);
  if (["true", "si", "sí", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "no", "0", "n"].includes(normalized)) return false;
  return null;
};

export const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = String(value)
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();
  const numberValue = Number(cleaned);
  return Number.isFinite(numberValue) ? numberValue : null;
};

export const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

export const readExcelFile = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("El archivo no contiene hojas para importar.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });
};

export const generateTemplateXLSX = () => {
  const exampleRows = [
    {
      Código: "EJEMPLO001", Descripción: "NUPEC ADULTO 2 KG", Costo: 180, Precio: 289, "Tipo venta": "unidad", Unidad: "pieza",
      "Usa inventario": "sí", IVA: 16, "Es global": "sí", Departamento: "NUPEC", "Stock inicial": 10, "Stock mínimo": 2, "Stock máximo": 50, "Clave SAT": "",
    },
    {
      Código: "EJEMPLO002", Descripción: "ROYAL CANIN MINI ADULT 2KG", Costo: 220, Precio: 349, "Tipo venta": "unidad", Unidad: "pieza",
      "Usa inventario": "sí", IVA: 16, "Es global": "sí", Departamento: "ROYAL CANIN", "Stock inicial": 5, "Stock mínimo": 1, "Stock máximo": 30, "Clave SAT": "",
    },
    {
      Código: "SERV001", Descripción: "BAÑO MASCOTA CHICA", Costo: 0, Precio: 250, "Tipo venta": "unidad", Unidad: "servicio",
      "Usa inventario": "no", IVA: 16, "Es global": "sí", Departamento: "ESTÉTICA", "Stock inicial": "", "Stock mínimo": "", "Stock máximo": "", "Clave SAT": "",
    },
  ];

  const instructionsRows = [
    ["CAMPO", "OBLIGATORIO", "VALORES / REGLA"],
    ["Código", "Sí", "Código de barras o código interno único. No debe repetirse."],
    ["Descripción", "Sí", "Nombre del producto o servicio."],
    ["Costo", "Sí", "Número mayor o igual a 0."],
    ["Precio", "Sí", "Número mayor o igual a 0."],
    ["Tipo venta", "Sí", "unidad / granel"],
    ["Unidad", "Sí", "pieza / kg / g / l / ml / servicio"],
    ["Usa inventario", "Sí", "sí / no"],
    ["IVA", "Sí", "0 / 8 / 16"],
    ["Es global", "Sí", "sí = crear en todas las sucursales; no = solo sucursal actual"],
    ["Departamento", "No", "Puede ser marca o familia comercial. Si no existe, se crea en MAYÚSCULAS."],
    ["Stock inicial", "No", "Solo aplica si Usa inventario = sí."],
    ["Stock mínimo", "No", "Solo aplica si Usa inventario = sí."],
    ["Stock máximo", "No", "Solo aplica si Usa inventario = sí."],
    ["Clave SAT", "No", "Si se captura, debe existir en el catálogo SAT cargado."],
  ];

  const worksheet = XLSX.utils.json_to_sheet(exampleRows, { header: TEMPLATE_COLUMNS });
  const instructionsWorksheet = XLSX.utils.aoa_to_sheet(instructionsRows);

  worksheet["!cols"] = [
    { wch: 18 }, { wch: 32 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 8 }, { wch: 12 },
    { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
  ];

  instructionsWorksheet["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 80 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
  XLSX.utils.book_append_sheet(workbook, instructionsWorksheet, "Instrucciones");

  XLSX.writeFile(workbook, "plantilla_productos_crokets.xlsx");
};