import React from "react";
import styles from "./ProductsImports.module.css";
import { formatCurrency } from "./utils/importUtils";
import { useProductsImport } from "./hooks/useProductsImport";
import { useAdminStatus } from "../../../../hooks/useIsAdmin";
import ImportInstructions from "./components/ImportInstructions/ImportInstructions";
import {
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
  DEPARTMENT_RULES,
  ALLOWED_VALUES,
  MAX_FILE_NOTE,
} from "./utils/importInstructionsConfig";
import fileImportIcon from "../../../../assets/icons/file-import-solid-full.svg";

const ProductsImports = () => {
  const {
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
  } = useProductsImport();
  const { isAdmin, loading: adminLoading } = useAdminStatus();

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) await loadFile(selectedFile);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) await loadFile(droppedFile);
  };

  if (adminLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.innerContainer}>
          <div className={styles.header}>
            <h1 className={styles.title}>Importar Productos</h1>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.innerContainer}>
          <div className={styles.header}>
            <h1 className={styles.title}>Importar Productos</h1>
          </div>
          <div className={styles.infoBox}>
            Solo un administrador puede importar productos.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Importar Productos</h1>
          <p className={styles.subtitle}>
            Carga tu base de datos de productos desde un archivo Excel (.xlsx,
            .csv)
          </p>
        </div>

        <div className={styles.content}>
          <div
            className={[
              styles.dropZone,
              file ? styles.hasFile : "",
              dragOver ? styles.dragOver : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(false);
            }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
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
                <img src={fileImportIcon} alt="" className={styles.icon} />
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
                <span className={styles.folderIcon} aria-hidden="true" />
                <h3>Arrastra tu archivo aquí o haz clic para buscar</h3>
                <p>Soporta archivos Excel (.xlsx) y CSV</p>
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.downloadTemplateBtn}
              onClick={generateTemplateXLSX}
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
              <div className={styles.summaryCard}>
                <span>Se crearán inactivos</span>
                <strong className={styles.warningText}>
                  {summary.inactive || 0}
                </strong>
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
                          ) : item.warnings.length > 0 ? (
                            <span className={styles.warningList}>
                              {item.warnings.join(" ")}
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

          <ImportInstructions
            requiredColumns={REQUIRED_COLUMNS}
            optionalColumns={OPTIONAL_COLUMNS}
            departmentRules={DEPARTMENT_RULES}
            allowedValues={ALLOWED_VALUES}
            footNote={MAX_FILE_NOTE}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductsImports;
