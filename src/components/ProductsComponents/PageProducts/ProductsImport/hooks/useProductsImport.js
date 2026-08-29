import { useState, useMemo, useRef } from "react";
import { useBranch } from "../../../../../contexts/BranchContext";
import { useProducts } from "../../../../../contexts/ProductsContext";
import {
  normalizeText, normalizeHeader, parseBoolean, parseNumber, REQUIRED_COLUMNS, SALE_TYPES, UNITS, IVA_VALUES, readExcelFile, generateTemplateXLSX
} from "../utils/importUtils";
import {
  fetchValidationData, fetchBranchesAndDepartments, createMissingDepartments, processImportTransaction
} from "../services/productsImportService";

export const useProductsImport = () => {
  const { branch } = useBranch();
  const { refreshProducts, refreshDepartments } = useProducts();

  const [file, setFile] = useState(null);
  const [validatedRows, setValidatedRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [globalErrors, setGlobalErrors] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);

  const validRowsCount = useMemo(() => validatedRows.filter((row) => row.errors.length === 0).length, [validatedRows]);
  const errorRowsCount = useMemo(() => validatedRows.filter((row) => row.errors.length > 0).length, [validatedRows]);

  const resetImportState = () => {
    setValidatedRows([]);
    setSummary(null);
    setGlobalErrors([]);
    setImportResult(null);
  };

  const handleClear = () => {
    setFile(null);
    resetImportState();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateRows = async (rawRows) => {
    const errors = [];
    if (!branch?.id) errors.push("No se detectó la sucursal actual.");

    const firstRow = rawRows[0] || {};
    const headerMap = {};
    Object.keys(firstRow).forEach((key) => { headerMap[normalizeHeader(key)] = key; });

    const missingColumns = REQUIRED_COLUMNS.filter((column) => !headerMap[normalizeHeader(column)]);
    if (missingColumns.length > 0) errors.push(`Faltan columnas obligatorias: ${missingColumns.join(", ")}.`);

    if (errors.length > 0) {
      setGlobalErrors(errors);
      setValidatedRows([]);
      setSummary(null);
      return;
    }

    const getValue = (row, column) => row[headerMap[normalizeHeader(column)]];
    const barcodes = rawRows.map((row) => String(getValue(row, "Código") || "").trim()).filter(Boolean);
    const duplicatedInFile = new Set(barcodes.filter((barcode, index) => barcodes.indexOf(barcode) !== index));

    const departmentNames = [...new Set(rawRows.map((row) => String(getValue(row, "Departamento") || "").trim().replace(/\s+/g, " ").toUpperCase()).filter(Boolean))];
    const satCodes = [...new Set(rawRows.map((row) => String(getValue(row, "Clave SAT") || "").trim()).filter(Boolean))];

    try {
      const { existingProducts, departments, existingSatCodes } = await fetchValidationData(barcodes, satCodes);
      
      const existingBarcodeSet = new Set(existingProducts.map((p) => String(p.barcode)));
      const satSet = new Set(existingSatCodes.map((row) => String(row.clave)));
      const departmentMapLocal = {};
      departments.forEach((dep) => { departmentMapLocal[normalizeText(dep.name)] = dep.id; });
      const missingDepartmentSet = new Set(departmentNames.filter((name) => !departmentMapLocal[normalizeText(name)]).map(normalizeText));

      const parsedRows = rawRows.map((row, index) => {
        const rowErrors = [];
        const barcode = String(getValue(row, "Código") || "").trim();
        const name = String(getValue(row, "Descripción") || "").trim();
        const costPrice = parseNumber(getValue(row, "Costo"));
        const salePrice = parseNumber(getValue(row, "Precio"));
        const saleType = normalizeText(getValue(row, "Tipo venta"));
        const unit = normalizeText(getValue(row, "Unidad"));
        const tracksInventory = parseBoolean(getValue(row, "Usa inventario"));
        const tax = parseNumber(getValue(row, "IVA"));
        const isGlobal = parseBoolean(getValue(row, "Es global"));
        const departmentName = String(getValue(row, "Departamento") || "").trim().replace(/\s+/g, " ").toUpperCase();
        const stockInitial = parseNumber(getValue(row, "Stock inicial"));
        const minStock = parseNumber(getValue(row, "Stock mínimo"));
        const maxStock = parseNumber(getValue(row, "Stock máximo"));
        const claveSat = String(getValue(row, "Clave SAT") || "").trim();

        if (!barcode) rowErrors.push("Código requerido.");
        if (!name) rowErrors.push("Descripción requerida.");
        if (costPrice === null || costPrice < 0) rowErrors.push("Costo inválido.");
        if (salePrice === null || salePrice < 0) rowErrors.push("Precio inválido.");
        if (!SALE_TYPES.includes(saleType)) rowErrors.push("Tipo venta debe ser unidad o granel.");
        if (!UNITS.includes(unit)) rowErrors.push(`Unidad inválida. Permitidas: ${UNITS.join(", ")}.`);
        if (tracksInventory === null) rowErrors.push("Usa inventario debe ser Sí/No o true/false.");
        if (tax === null || !IVA_VALUES.includes(tax)) rowErrors.push("IVA debe ser 0, 8 o 16.");
        if (isGlobal === null) rowErrors.push("Es global debe ser Sí/No o true/false.");
        if (duplicatedInFile.has(barcode)) rowErrors.push("Código duplicado dentro del archivo.");
        if (existingBarcodeSet.has(barcode)) rowErrors.push("Código ya existe en productos.");

        let departmentId = null;
        let departmentNeedsCreate = false;

        if (departmentName) {
          departmentId = departmentMapLocal[normalizeText(departmentName)] || null;
          departmentNeedsCreate = !departmentId && missingDepartmentSet.has(normalizeText(departmentName));
        }

        if (claveSat && !satSet.has(claveSat)) rowErrors.push(`Clave SAT no encontrada: ${claveSat}.`);

        const normalizedTracksInventory = tracksInventory === true;
        const normalizedStockInitial = normalizedTracksInventory ? Number(stockInitial || 0) : 0;
        const normalizedMinStock = normalizedTracksInventory ? Number(minStock || 0) : 0;
        const normalizedMaxStock = normalizedTracksInventory ? Number(maxStock || 0) : 0;

        if (normalizedTracksInventory) {
          if (normalizedStockInitial < 0) rowErrors.push("Stock inicial no puede ser negativo.");
          if (normalizedMinStock < 0) rowErrors.push("Stock mínimo no puede ser negativo.");
          if (normalizedMaxStock < 0) rowErrors.push("Stock máximo no puede ser negativo.");
          if (normalizedMaxStock > 0 && normalizedMinStock > normalizedMaxStock) rowErrors.push("Stock mínimo no puede ser mayor al máximo.");
        }

        return {
          rowNumber: index + 2, raw: row, errors: rowErrors, department_name: departmentName || null, department_needs_create: departmentNeedsCreate,
          product: {
            barcode, name, cost_price: Number(costPrice || 0), sale_price: Number(salePrice || 0), sale_type: saleType, unit, tracks_inventory: normalizedTracksInventory,
            tax: Number(tax || 0), is_global: isGlobal === true, department_id: departmentId, clave_sat: claveSat || null, status: true, is_kit: false, commission_enabled: false, commission_percent: 0, commission_type: "percent", commission_value: 0,
          },
          inventory: { stock: normalizedStockInitial, min_stock: normalizedMinStock, max_stock: normalizedMaxStock, is_active: true, has_been_stocked: normalizedTracksInventory ? normalizedStockInitial > 0 : false },
        };
      });

      setGlobalErrors([]);
      setValidatedRows(parsedRows);
      setSummary({
        total: parsedRows.length,
        valid: parsedRows.filter((item) => item.errors.length === 0).length,
        errors: parsedRows.filter((item) => item.errors.length > 0).length,
        departmentsToCreate: [...new Set(parsedRows.filter((item) => item.errors.length === 0 && item.department_needs_create).map((item) => item.department_name).filter(Boolean))].length,
      });

    } catch (error) {
      console.error("Error al validar datos:", error);
      setGlobalErrors(["Error al conectar con la base de datos para validación."]);
    }
  };

  const loadFile = async (selectedFile) => {
    resetImportState();
    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    
    if (!["xlsx", "xls", "csv"].includes(extension)) {
      setGlobalErrors(["El archivo debe ser Excel (.xlsx, .xls) o CSV."]);
      setFile(null);
      return;
    }
    
    if (selectedFile.size > 5 * 1024 * 1024) {
      setGlobalErrors(["El archivo no debe exceder los 5MB."]);
      setFile(null);
      return;
    }

    try {
      setProcessing(true);
      setFile(selectedFile);
      const jsonRows = await readExcelFile(selectedFile);
      
      if (!jsonRows.length) {
        setGlobalErrors(["El archivo no contiene productos para importar."]);
        return;
      }
      
      await validateRows(jsonRows);
    } catch (error) {
      console.error("Error leyendo archivo:", error);
      setGlobalErrors([error.message || "No se pudo leer el archivo. Revisa que no esté dañado."]);
    } finally {
      setProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!branch?.id) return setGlobalErrors(["No se detectó la sucursal actual."]);
    
    const validRows = validatedRows.filter((row) => row.errors.length === 0);
    if (!validRows.length) return setGlobalErrors(["No hay productos válidos para importar."]);

    try {
      setImporting(true);
      setImportResult(null);
      setGlobalErrors([]);

      const { branches, departments } = await fetchBranchesAndDepartments();
      const departmentMap = {};
      departments.forEach((dep) => { departmentMap[normalizeText(dep.name)] = dep.id; });

      const requestedDepartmentNames = [...new Set(validRows.map((item) => item.department_name).filter(Boolean).map((n) => n.toUpperCase()))];
      const departmentsToCreate = requestedDepartmentNames.filter((name) => !departmentMap[normalizeText(name)]);

      let createdDepartmentsCount = 0;
      if (departmentsToCreate.length > 0) {
        const createdDeps = await createMissingDepartments(departmentsToCreate);
        createdDepartmentsCount = createdDeps.length;
        createdDeps.forEach((dep) => { departmentMap[normalizeText(dep.name)] = dep.id; });
      }

      const { createdProductsCount, createdInventoriesCount } = await processImportTransaction(validRows, branch.id, branches, departmentMap);

      await refreshDepartments();
      await refreshProducts();

      setImportResult({ success: true, message: `Importación completada. Productos creados: ${createdProductsCount}. Registros de inventario: ${createdInventoriesCount}. Departamentos creados: ${createdDepartmentsCount}.` });
      handleClear();
    } catch (error) {
      console.error("Error importando productos:", error);
      setImportResult({ success: false, message: error.message || "No se pudo completar la importación." });
    } finally {
      setImporting(false);
    }
  };

  return {
    file, fileInputRef, validatedRows, summary, globalErrors, processing, importing, importResult, dragOver,
    validRowsCount, errorRowsCount, setDragOver, handleClear, loadFile, handleImport, generateTemplateXLSX
  };
};