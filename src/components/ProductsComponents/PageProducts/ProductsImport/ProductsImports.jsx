import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import styles from "./ProductsImports.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import { useBranch } from "../../../../contexts/BranchContext";
import { useProducts } from "../../../../contexts/ProductsContext";

const REQUIRED_COLUMNS = [
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

const OPTIONAL_COLUMNS = [
  "Departamento",
  "Stock inicial",
  "Stock mínimo",
  "Stock máximo",
  "Clave SAT",
];

const TEMPLATE_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];
const SALE_TYPES = ["unidad", "granel"];
const UNITS = ["pieza", "kg", "g", "l", "ml", "servicio"];
const IVA_VALUES = [0, 8, 16];

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const normalizeHeader = (value) => normalizeText(value).replace(/\s+/g, " ");

const parseBoolean = (value) => {
  const normalized = normalizeText(value);

  if (["true", "si", "sí", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "no", "0", "n"].includes(normalized)) return false;

  return null;
};

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const cleaned = String(value)
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  const numberValue = Number(cleaned);

  return Number.isFinite(numberValue) ? numberValue : null;
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

const ProductsImports = () => {
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

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];

    if (selectedFile) {
      await loadFile(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const droppedFile = e.dataTransfer.files?.[0];

    if (droppedFile) {
      await loadFile(droppedFile);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
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

      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setGlobalErrors(["El archivo no contiene hojas para importar."]);
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
      });

      if (!jsonRows.length) {
        setGlobalErrors(["El archivo no contiene productos para importar."]);
        return;
      }

      await validateRows(jsonRows);
    } catch (error) {
      console.error("Error leyendo archivo:", error);
      setGlobalErrors(["No se pudo leer el archivo. Revisa que no esté dañado."]);
    } finally {
      setProcessing(false);
    }
  };

  const validateRows = async (rawRows) => {
    const errors = [];

    if (!branch?.id) {
      errors.push("No se detectó la sucursal actual.");
    }

    const firstRow = rawRows[0] || {};
    const headerMap = {};

    Object.keys(firstRow).forEach((key) => {
      headerMap[normalizeHeader(key)] = key;
    });

    const missingColumns = REQUIRED_COLUMNS.filter(
      (column) => !headerMap[normalizeHeader(column)]
    );

    if (missingColumns.length > 0) {
      errors.push(`Faltan columnas obligatorias: ${missingColumns.join(", ")}.`);
    }

    if (errors.length > 0) {
      setGlobalErrors(errors);
      setValidatedRows([]);
      setSummary(null);
      return;
    }

    const getValue = (row, column) => row[headerMap[normalizeHeader(column)]];

    const barcodes = rawRows
      .map((row) => String(getValue(row, "Código") || "").trim())
      .filter(Boolean);

    const duplicatedInFile = new Set(
      barcodes.filter((barcode, index) => barcodes.indexOf(barcode) !== index)
    );

    const { data: existingProducts, error: existingError } = barcodes.length
      ? await supabase
          .from("products")
          .select("id, barcode")
          .in("barcode", [...new Set(barcodes)])
      : { data: [], error: null };

    if (existingError) {
      setGlobalErrors(["No se pudo validar códigos existentes en Supabase."]);
      return;
    }

    const existingBarcodeSet = new Set(
      (existingProducts || []).map((product) => String(product.barcode))
    );

    const departmentNames = [
      ...new Set(
        rawRows
          .map((row) =>
            String(getValue(row, "Departamento") || "")
              .trim()
              .replace(/\s+/g, " ")
              .toUpperCase()
          )
          .filter(Boolean)
      ),
    ];

    const { data: allDepartments, error: departmentsError } = await supabase
      .from("departments")
      .select("id, name");

    if (departmentsError) {
      setGlobalErrors(["No se pudieron validar los departamentos."]);
      return;
    }

    const departmentMap = {};

    (allDepartments || []).forEach((department) => {
      departmentMap[normalizeText(department.name)] = department.id;
    });

    const missingDepartmentNames = departmentNames.filter(
      (name) => !departmentMap[normalizeText(name)]
    );

    const missingDepartmentSet = new Set(
      missingDepartmentNames.map((name) => normalizeText(name))
    );

    const satCodes = [
      ...new Set(
        rawRows
          .map((row) => String(getValue(row, "Clave SAT") || "").trim())
          .filter(Boolean)
      ),
    ];

    const { data: satRows, error: satError } = satCodes.length
      ? await supabase
          .from("sat_claves_productos_servicios")
          .select("clave")
          .in("clave", satCodes)
      : { data: [], error: null };

    if (satError) {
      setGlobalErrors(["No se pudieron validar las claves SAT."]);
      return;
    }

    const satSet = new Set((satRows || []).map((row) => String(row.clave)));

    const parsedRows = rawRows.map((row, index) => {
      const rowErrors = [];

      const barcode = String(getValue(row, "Código") || "").trim();
      const name = String(getValue(row, "Descripción") || "").trim();
      const costPrice = parseNumber(getValue(row, "Costo"));
      const salePrice = parseNumber(getValue(row, "Precio"));

      // Estandarización antes de guardar:
      // Tipo venta y unidad siempre van en minúsculas.
      // Booleanos se convierten a true/false.
      // IVA se guarda como número.
      // Departamento se guarda en MAYÚSCULAS si existe.
      const saleType = normalizeText(getValue(row, "Tipo venta"));
      const unit = normalizeText(getValue(row, "Unidad"));
      const tracksInventory = parseBoolean(getValue(row, "Usa inventario"));
      const tax = parseNumber(getValue(row, "IVA"));
      const isGlobal = parseBoolean(getValue(row, "Es global"));

      const departmentName = String(getValue(row, "Departamento") || "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();

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
        departmentId = departmentMap[normalizeText(departmentName)] || null;
        departmentNeedsCreate =
          !departmentId && missingDepartmentSet.has(normalizeText(departmentName));
      }

      if (claveSat && !satSet.has(claveSat)) {
        rowErrors.push(`Clave SAT no encontrada: ${claveSat}.`);
      }

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
        if (normalizedStockInitial < 0) rowErrors.push("Stock inicial no puede ser negativo.");
        if (normalizedMinStock < 0) rowErrors.push("Stock mínimo no puede ser negativo.");
        if (normalizedMaxStock < 0) rowErrors.push("Stock máximo no puede ser negativo.");

        if (normalizedMaxStock > 0 && normalizedMinStock > normalizedMaxStock) {
          rowErrors.push("Stock mínimo no puede ser mayor al máximo.");
        }
      }

      return {
        rowNumber: index + 2,
        raw: row,
        errors: rowErrors,
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
          status: true,
          is_kit: false,
          commission_enabled: false,
          commission_percent: 0,
        },
        inventory: {
          stock: normalizedStockInitial,
          min_stock: normalizedMinStock,
          max_stock: normalizedMaxStock,
          is_active: true,
          has_been_stocked: normalizedTracksInventory
            ? normalizedStockInitial > 0
            : false,
        },
      };
    });

    setGlobalErrors([]);
    setValidatedRows(parsedRows);
    setSummary({
      total: parsedRows.length,
      valid: parsedRows.filter((item) => item.errors.length === 0).length,
      errors: parsedRows.filter((item) => item.errors.length > 0).length,
      departmentsToCreate: [
        ...new Set(
          parsedRows
            .filter((item) => item.errors.length === 0 && item.department_needs_create)
            .map((item) => item.department_name)
            .filter(Boolean)
        ),
      ].length,
    });
  };

  const handleDownloadTemplate = () => {
    const exampleRows = [
      {
        Código: "EJEMPLO001",
        Descripción: "NUPEC ADULTO 2 KG",
        Costo: 180,
        Precio: 289,
        "Tipo venta": "unidad",
        Unidad: "pieza",
        "Usa inventario": "sí",
        IVA: 16,
        "Es global": "sí",
        Departamento: "NUPEC",
        "Stock inicial": 10,
        "Stock mínimo": 2,
        "Stock máximo": 50,
        "Clave SAT": "",
      },
      {
        Código: "EJEMPLO002",
        Descripción: "ROYAL CANIN MINI ADULT 2KG",
        Costo: 220,
        Precio: 349,
        "Tipo venta": "unidad",
        Unidad: "pieza",
        "Usa inventario": "sí",
        IVA: 16,
        "Es global": "sí",
        Departamento: "ROYAL CANIN",
        "Stock inicial": 5,
        "Stock mínimo": 1,
        "Stock máximo": 30,
        "Clave SAT": "",
      },
      {
        Código: "SERV001",
        Descripción: "BAÑO MASCOTA CHICA",
        Costo: 0,
        Precio: 250,
        "Tipo venta": "unidad",
        Unidad: "servicio",
        "Usa inventario": "no",
        IVA: 16,
        "Es global": "sí",
        Departamento: "ESTÉTICA",
        "Stock inicial": "",
        "Stock mínimo": "",
        "Stock máximo": "",
        "Clave SAT": "",
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

    const worksheet = XLSX.utils.json_to_sheet(exampleRows, {
      header: TEMPLATE_COLUMNS,
    });

    const instructionsWorksheet = XLSX.utils.aoa_to_sheet(instructionsRows);

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 32 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 8 },
      { wch: 12 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
    ];

    instructionsWorksheet["!cols"] = [
      { wch: 20 },
      { wch: 14 },
      { wch: 80 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
    XLSX.utils.book_append_sheet(workbook, instructionsWorksheet, "Instrucciones");

    XLSX.writeFile(workbook, "plantilla_productos_crokets.xlsx");
  };

  const handleImport = async () => {
    if (!branch?.id) {
      setGlobalErrors(["No se detectó la sucursal actual."]);
      return;
    }

    const validRows = validatedRows.filter((row) => row.errors.length === 0);

    if (!validRows.length) {
      setGlobalErrors(["No hay productos válidos para importar."]);
      return;
    }

    try {
      setImporting(true);
      setImportResult(null);
      setGlobalErrors([]);

      const { data: allBranches, error: branchesError } = await supabase
        .from("branches")
        .select("id");

      if (branchesError) throw branchesError;

      const { data: currentDepartments, error: currentDepartmentsError } =
        await supabase.from("departments").select("id, name");

      if (currentDepartmentsError) throw currentDepartmentsError;

      const departmentMap = {};

      (currentDepartments || []).forEach((department) => {
        departmentMap[normalizeText(department.name)] = department.id;
      });

      const requestedDepartmentNames = [
        ...new Set(
          validRows
            .map((item) => item.department_name)
            .filter(Boolean)
            .map((name) => name.toUpperCase())
        ),
      ];

      const departmentsToCreate = requestedDepartmentNames.filter(
        (name) => !departmentMap[normalizeText(name)]
      );

      let createdDepartmentsCount = 0;

      if (departmentsToCreate.length > 0) {
        const { data: createdDepartments, error: createDepartmentsError } =
          await supabase
            .from("departments")
            .insert(departmentsToCreate.map((name) => ({ name })))
            .select("id, name");

        if (createDepartmentsError) throw createDepartmentsError;

        createdDepartmentsCount = createdDepartments?.length || 0;

        (createdDepartments || []).forEach((department) => {
          departmentMap[normalizeText(department.name)] = department.id;
        });
      }

      let createdProducts = 0;
      let createdInventories = 0;

      for (const item of validRows) {
        const productToInsert = {
          ...item.product,
          department_id: item.department_name
            ? departmentMap[normalizeText(item.department_name)] || null
            : null,
        };

        const { data: product, error: productError } = await supabase
          .from("products")
          .insert(productToInsert)
          .select("id, is_global, tracks_inventory")
          .single();

        if (productError) throw productError;

        createdProducts += 1;

        if (product.tracks_inventory) {
          const targetBranchIds = product.is_global
            ? (allBranches || []).map((itemBranch) => itemBranch.id)
            : [branch.id];

          const inventoryRows = targetBranchIds.map((branchId) => {
            const isCurrentBranch = branchId === branch.id;

            return {
              branch_id: branchId,
              product_id: product.id,
              stock: isCurrentBranch ? item.inventory.stock : 0,
              min_stock: isCurrentBranch ? item.inventory.min_stock : 0,
              max_stock: isCurrentBranch ? item.inventory.max_stock : 0,
              is_active: true,
              has_been_stocked: isCurrentBranch
                ? item.inventory.has_been_stocked
                : false,
              cost_price: productToInsert.cost_price,
              sale_price: productToInsert.sale_price,
            };
          });

          const { error: inventoryError } = await supabase
            .from("branch_inventory")
            .insert(inventoryRows);

          if (inventoryError) throw inventoryError;

          createdInventories += inventoryRows.length;
        }
      }

      await refreshDepartments();
      await refreshProducts();

      setImportResult({
        success: true,
        message: `Importación completada. Productos creados: ${createdProducts}. Registros de inventario creados: ${createdInventories}. Departamentos creados: ${createdDepartmentsCount}.`,
      });

      setFile(null);
      setValidatedRows([]);
      setSummary(null);
      setGlobalErrors([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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

  const handleClear = () => {
    setFile(null);
    resetImportState();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Importar Productos</h1>
          <p className={styles.subtitle}>
            Carga tu base de datos de productos desde un archivo Excel (.xlsx, .csv)
          </p>
        </div>

        <div className={styles.content}>
          <div
            className={`${styles.dropZone} ${file ? styles.hasFile : ""} ${
              dragOver ? styles.dragOver : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadClick}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              style={{ display: "none" }}
            />

            {file ? (
              <div className={styles.fileInfo}>
                <div className={styles.icon}>📄</div>
                <div className={styles.fileName}>{file.name}</div>
                <div className={styles.fileSize}>
                  {(file.size / 1024).toFixed(2)} KB
                </div>

                <div className={styles.fileActions}>
                  <button
                    type="button"
                    className={styles.changeFileBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Cambiar archivo
                  </button>

                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                  >
                    Eliminar archivo
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.uploadPrompt}>
                <div className={styles.icon}>📁</div>
                <h3>Arrastra tu archivo aquí o haz clic para buscar</h3>
                <p>Soporta archivos Excel (.xlsx) y CSV</p>
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.downloadTemplateBtn}
              onClick={handleDownloadTemplate}
              disabled={processing || importing}
            >
              Descargar Plantilla
            </button>

            <button
              type="button"
              className={styles.importBtn}
              disabled={
                !file ||
                processing ||
                importing ||
                validRowsCount === 0 ||
                errorRowsCount > 0
              }
              onClick={handleImport}
            >
              {importing ? "Importando..." : "Importar Base de Datos"}
            </button>
          </div>

          {processing && (
            <div className={styles.infoBox}>Leyendo y validando archivo...</div>
          )}

          {globalErrors.length > 0 && (
            <div className={styles.errorBox}>
              {globalErrors.map((item, index) => (
                <div key={index}>{item}</div>
              ))}
            </div>
          )}

          {importResult && (
            <div
              className={
                importResult.success ? styles.successBox : styles.errorBox
              }
            >
              {importResult.message}
            </div>
          )}

          {summary && (
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <span>Total</span>
                <strong>{summary.total}</strong>
              </div>
              <div className={styles.summaryCard}>
                <span>Válidos</span>
                <strong className={styles.successText}>{summary.valid}</strong>
              </div>
              <div className={styles.summaryCard}>
                <span>Con errores</span>
                <strong className={styles.errorText}>{summary.errors}</strong>
              </div>
              <div className={styles.summaryCard}>
                <span>Deptos. nuevos</span>
                <strong>{summary.departmentsToCreate || 0}</strong>
              </div>
            </div>
          )}

          {validatedRows.length > 0 && (
            <div className={styles.previewCard}>
              <div className={styles.previewHeader}>
                <h3>Previsualización</h3>
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={handleClear}
                  disabled={importing}
                >
                  Limpiar
                </button>
              </div>

              <div className={styles.previewTableWrapper}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>Fila</th>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th>Costo</th>
                      <th>Precio</th>
                      <th>Tipo</th>
                      <th>Unidad</th>
                      <th>Inventario</th>
                      <th>IVA</th>
                      <th>Global</th>
                      <th>Departamento</th>
                      <th>Stock</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validatedRows.map((item) => (
                      <tr
                        key={item.rowNumber}
                        className={
                          item.errors.length > 0
                            ? styles.rowError
                            : styles.rowValid
                        }
                      >
                        <td>{item.rowNumber}</td>
                        <td>{item.product.barcode}</td>
                        <td>{item.product.name}</td>
                        <td>{formatCurrency(item.product.cost_price)}</td>
                        <td>{formatCurrency(item.product.sale_price)}</td>
                        <td>{item.product.sale_type}</td>
                        <td>{item.product.unit}</td>
                        <td>{item.product.tracks_inventory ? "Sí" : "No"}</td>
                        <td>{item.product.tax}%</td>
                        <td>{item.product.is_global ? "Sí" : "No"}</td>
                        <td>
                          {item.product.department_id
                            ? "Asignado"
                            : item.department_needs_create
                            ? `Crear: ${item.department_name}`
                            : "Sin departamento"}
                        </td>
                        <td>
                          {item.product.tracks_inventory
                            ? item.inventory.stock
                            : "-"}
                        </td>
                        <td>
                          {item.errors.length > 0 ? (
                            <span className={styles.errorList}>
                              {item.errors.join(" ")}
                            </span>
                          ) : (
                            <span className={styles.successText}>OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className={styles.instructions}>
            <h3>Instrucciones importantes:</h3>
            <ul>
              <li>
                Las columnas obligatorias son:{" "}
                <strong>
                  Código, Descripción, Costo, Precio, Tipo venta, Unidad, Usa
                  inventario, IVA, Es global.
                </strong>
              </li>
              <li>
                Departamento, Stock inicial, Stock mínimo, Stock máximo y Clave
                SAT son opcionales.
              </li>
              <li>
                Si no capturas Departamento, el producto se guardará sin
                departamento.
              </li>
              <li>
                Si capturas un Departamento que no existe, se creará
                automáticamente en MAYÚSCULAS.
              </li>
              <li>
                <strong>Tipo de venta permitidos:</strong> unidad, granel.
                Se guardará siempre en minúsculas.
              </li>
              <li>
                <strong>Unidades permitidas:</strong> pieza, kg, g, l, ml,
                servicio. Se guardará siempre en minúsculas.
              </li>
              <li>
                <strong>Usa inventario:</strong> sí/no, true/false o 1/0.
              </li>
              <li>
                <strong>Es global:</strong> sí/no, true/false o 1/0.
              </li>
              <li>
                <strong>IVA permitido:</strong> 0, 8 o 16. También acepta 16%.
              </li>
              <li>El archivo no debe exceder los 5MB.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsImports;
