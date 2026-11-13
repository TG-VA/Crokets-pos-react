import {
  normalizeText,
  normalizeHeader,
  parseBoolean,
  parseNumber,
  REQUIRED_COLUMNS,
  SALE_TYPES,
  UNITS,
  IVA_VALUES,
} from "../utils/importUtils";

const normalizeDepartmentName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

export const buildHeaderMap = (rawRows) => {
  const firstRow = rawRows[0] || {};
  const headerMap = {};
  Object.keys(firstRow).forEach((key) => {
    headerMap[normalizeHeader(key)] = key;
  });
  return headerMap;
};

export const getMissingColumns = (headerMap) =>
  REQUIRED_COLUMNS.filter((column) => !headerMap[normalizeHeader(column)]);

const createGetValue = (headerMap) => (row, column) =>
  row[headerMap[normalizeHeader(column)]];

export const collectLookupKeys = (rawRows, headerMap) => {
  const getValue = createGetValue(headerMap);
  const barcodes = rawRows
    .map((row) => String(getValue(row, "Código") || "").trim())
    .filter(Boolean);
  const satCodes = [
    ...new Set(
      rawRows
        .map((row) => String(getValue(row, "Clave SAT") || "").trim())
        .filter(Boolean)
    ),
  ];
  return { barcodes, satCodes };
};

export const buildValidatedRows = (
  rawRows,
  headerMap,
  { existingProducts, departments, existingSatCodes },
  barcodes = collectLookupKeys(rawRows, headerMap).barcodes
) => {
  const getValue = createGetValue(headerMap);
  const duplicatedInFile = new Set(
    barcodes.filter((barcode, index) => barcodes.indexOf(barcode) !== index)
  );

  const departmentNames = [
    ...new Set(
      rawRows
        .map((row) => normalizeDepartmentName(getValue(row, "Departamento")))
        .filter(Boolean)
    ),
  ];

  const existingBarcodeSet = new Set(
    existingProducts.map((p) => String(p.barcode))
  );
  const satSet = new Set(existingSatCodes.map((row) => String(row.clave)));
  const departmentMapLocal = {};
  const inactiveDepartmentIds = new Set();
  departments.forEach((dep) => {
    departmentMapLocal[normalizeText(dep.name)] = dep.id;
    if (dep.status === false) inactiveDepartmentIds.add(dep.id);
  });
  const missingDepartmentSet = new Set(
    departmentNames
      .filter((name) => !departmentMapLocal[normalizeText(name)])
      .map(normalizeText)
  );

  return rawRows.map((row, index) => {
    const rowErrors = [];
    const rowWarnings = [];
    const barcode = String(getValue(row, "Código") || "").trim();
    const name = String(getValue(row, "Descripción") || "").trim();
    const costPrice = parseNumber(getValue(row, "Costo"));
    const salePrice = parseNumber(getValue(row, "Precio"));
    const saleType = normalizeText(getValue(row, "Tipo venta"));
    const unit = normalizeText(getValue(row, "Unidad"));
    const tracksInventory = parseBoolean(getValue(row, "Usa inventario"));
    const tax = parseNumber(getValue(row, "IVA"));
    const isGlobal = parseBoolean(getValue(row, "Es global"));
    const departmentName = normalizeDepartmentName(
      getValue(row, "Departamento")
    );
    const stockInitial = parseNumber(getValue(row, "Stock inicial"));
    const minStock = parseNumber(getValue(row, "Stock mínimo"));
    const maxStock = parseNumber(getValue(row, "Stock máximo"));
    const claveSat = String(getValue(row, "Clave SAT") || "").trim();

    if (!barcode) rowErrors.push("Código requerido.");
    if (!name) rowErrors.push("Descripción requerida.");
    if (costPrice === null || costPrice < 0) rowErrors.push("Costo inválido.");
    if (salePrice === null || salePrice < 0) rowErrors.push("Precio inválido.");
    if (!SALE_TYPES.includes(saleType))
      rowErrors.push("Tipo venta debe ser unidad o granel.");
    if (!UNITS.includes(unit))
      rowErrors.push(`Unidad inválida. Permitidas: ${UNITS.join(", ")}.`);
    if (tracksInventory === null)
      rowErrors.push("Usa inventario debe ser Sí/No, true/false o 1/0.");
    if (tax === null || !IVA_VALUES.includes(tax))
      rowErrors.push("IVA debe ser 0, 8 o 16.");
    if (isGlobal === null)
      rowErrors.push("Es global debe ser Sí/No, true/false o 1/0.");
    if (duplicatedInFile.has(barcode))
      rowErrors.push("Código duplicado dentro del archivo.");
    if (existingBarcodeSet.has(barcode))
      rowErrors.push("Código ya existe en productos.");

    let departmentId = null;
    let departmentNeedsCreate = false;

    if (departmentName) {
      departmentId = departmentMapLocal[normalizeText(departmentName)] || null;
      departmentNeedsCreate =
        !departmentId &&
        missingDepartmentSet.has(normalizeText(departmentName));
    }

    const isActive = !inactiveDepartmentIds.has(departmentId);
    if (!isActive)
      rowWarnings.push(
        "Departamento inactivo: el producto se creará inactivo."
      );

    if (claveSat && !satSet.has(claveSat))
      rowErrors.push(`Clave SAT no encontrada: ${claveSat}.`);

    const normalizedTracksInventory = tracksInventory === true;
    const normalizedStockInitial = normalizedTracksInventory
      ? Number(stockInitial || 0)
      : 0;
    const normalizedMinStock = normalizedTracksInventory
      ? Number(minStock || 0)
      : 0;
    const normalizedMaxStock = normalizedTracksInventory
      ? Number(maxStock || 0)
      : 0;

    if (normalizedTracksInventory) {
      if (normalizedStockInitial < 0)
        rowErrors.push("Stock inicial no puede ser negativo.");
      if (normalizedMinStock < 0)
        rowErrors.push("Stock mínimo no puede ser negativo.");
      if (normalizedMaxStock < 0)
        rowErrors.push("Stock máximo no puede ser negativo.");
      if (normalizedMaxStock > 0 && normalizedMinStock > normalizedMaxStock)
        rowErrors.push("Stock mínimo no puede ser mayor al máximo.");
    }

    return {
      rowNumber: index + 2,
      raw: row,
      errors: rowErrors,
      warnings: rowWarnings,
      department_name: departmentName || null,
      department_needs_create: departmentNeedsCreate,
      product: {
        barcode,
        name,
        cost_price: Number(costPrice || 0),
        sale_price: Number(salePrice || 0),
        sale_type: saleType,
        unit,
        tracks_inventory: normalizedTracksInventory,
        tax: Number(tax || 0),
        is_global: isGlobal === true,
        department_id: departmentId,
        clave_sat: claveSat || null,
        status: isActive,
        is_kit: false,
        commission_enabled: false,
        commission_percent: 0,
        commission_type: "percent",
        commission_value: 0,
      },
      inventory: {
        stock: normalizedStockInitial,
        min_stock: normalizedMinStock,
        max_stock: normalizedMaxStock,
        is_active: isActive,
        has_been_stocked: normalizedTracksInventory
          ? normalizedStockInitial > 0
          : false,
      },
    };
  });
};

export const buildImportSummary = (parsedRows) => ({
  total: parsedRows.length,
  valid: parsedRows.filter((item) => item.errors.length === 0).length,
  errors: parsedRows.filter((item) => item.errors.length > 0).length,
  inactive: parsedRows.filter(
    (item) => item.errors.length === 0 && !item.product.status
  ).length,
  departmentsToCreate: [
    ...new Set(
      parsedRows
        .filter(
          (item) => item.errors.length === 0 && item.department_needs_create
        )
        .map((item) => item.department_name)
        .filter(Boolean)
    ),
  ].length,
});
