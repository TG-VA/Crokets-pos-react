import { useState, useMemo, useRef } from "react";
import { useBranch } from "../../../../../contexts/BranchContext";
import { useProducts } from "../../../../../contexts/ProductsContext";
import {
  normalizeText,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_MESSAGE,
  readExcelFile,
  generateTemplateXLSX,
} from "../utils/importUtils";
import {
  fetchValidationData,
  fetchBranchesAndDepartments,
  createMissingDepartments,
  processImportTransaction,
} from "../services/productsImportService";
import {
  buildHeaderMap,
  getMissingColumns,
  collectLookupKeys,
  buildValidatedRows,
  buildImportSummary,
} from "../services/productsImportCalculationService";

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

  const validRowsCount = useMemo(
    () => validatedRows.filter((row) => row.errors.length === 0).length,
    [validatedRows]
  );
  const errorRowsCount = useMemo(
    () => validatedRows.filter((row) => row.errors.length > 0).length,
    [validatedRows]
  );

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

    const headerMap = buildHeaderMap(rawRows);
    const missingColumns = getMissingColumns(headerMap);
    if (missingColumns.length > 0)
      errors.push(
        `Faltan columnas obligatorias: ${missingColumns.join(", ")}.`
      );

    if (errors.length > 0) {
      setGlobalErrors(errors);
      setValidatedRows([]);
      setSummary(null);
      return;
    }

    const { barcodes, satCodes } = collectLookupKeys(rawRows, headerMap);

    try {
      const validationData = await fetchValidationData(barcodes, satCodes);
      const parsedRows = buildValidatedRows(rawRows, headerMap, validationData);

      setGlobalErrors([]);
      setValidatedRows(parsedRows);
      setSummary(buildImportSummary(parsedRows));
    } catch (error) {
      console.error("Error al validar datos:", error);
      setGlobalErrors([
        "Error al conectar con la base de datos para validación.",
      ]);
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

    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setGlobalErrors([MAX_FILE_SIZE_MESSAGE]);
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
      setGlobalErrors([
        error.message ||
          "No se pudo leer el archivo. Revisa que no esté dañado.",
      ]);
    } finally {
      setProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!branch?.id)
      return setGlobalErrors(["No se detectó la sucursal actual."]);

    const validRows = validatedRows.filter((row) => row.errors.length === 0);
    if (!validRows.length)
      return setGlobalErrors(["No hay productos válidos para importar."]);

    try {
      setImporting(true);
      setImportResult(null);
      setGlobalErrors([]);

      const { branches, departments } = await fetchBranchesAndDepartments();
      const departmentMap = {};
      departments.forEach((dep) => {
        departmentMap[normalizeText(dep.name)] = dep.id;
      });

      const requestedDepartmentNames = [
        ...new Set(
          validRows
            .map((item) => item.department_name)
            .filter(Boolean)
            .map((n) => n.toUpperCase())
        ),
      ];
      const departmentsToCreate = requestedDepartmentNames.filter(
        (name) => !departmentMap[normalizeText(name)]
      );

      let createdDepartmentsCount = 0;
      if (departmentsToCreate.length > 0) {
        const createdDeps = await createMissingDepartments(departmentsToCreate);
        createdDepartmentsCount = createdDeps.length;
        createdDeps.forEach((dep) => {
          departmentMap[normalizeText(dep.name)] = dep.id;
        });
      }

      const { createdProductsCount, createdInventoriesCount } =
        await processImportTransaction(
          validRows,
          branch.id,
          branches,
          departmentMap
        );

      await refreshDepartments();
      await refreshProducts();

      setImportResult({
        success: true,
        message: `Importación completada. Productos creados: ${createdProductsCount}. Registros de inventario: ${createdInventoriesCount}. Departamentos creados: ${createdDepartmentsCount}.`,
      });
      handleClear();
    } catch (error) {
      console.error("Error importando productos:", error);
      setImportResult({
        success: false,
        message: error.message || "No se pudo completar la importación.",
      });
    } finally {
      setImporting(false);
    }
  };

  return {
    file,
    fileInputRef,
    validatedRows,
    summary,
    globalErrors,
    processing,
    importing,
    importResult,
    dragOver,
    validRowsCount,
    errorRowsCount,
    setDragOver,
    handleClear,
    loadFile,
    handleImport,
    generateTemplateXLSX,
  };
};
