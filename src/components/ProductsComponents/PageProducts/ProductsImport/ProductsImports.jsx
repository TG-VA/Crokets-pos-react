import React from "react";
import styles from "./ProductsImports.module.css";
import { formatCurrency } from "./utils/importUtils";
import { useProductsImport } from "./hooks/useProductsImport";

const ProductsImports = () => {
  const {
    file, fileInputRef, validatedRows, summary, globalErrors, processing, importing, importResult, dragOver,
    validRowsCount, errorRowsCount, setDragOver, handleClear, loadFile, handleImport, generateTemplateXLSX
  } = useProductsImport();

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

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Importar Productos</h1>
          <p className={styles.subtitle}>Carga tu base de datos de productos desde un archivo Excel (.xlsx, .csv)</p>
        </div>

        <div className={styles.content}>
          <div
            className={[styles.dropZone, file ? styles.hasFile : "", dragOver ? styles.dragOver : ""].filter(Boolean).join(" ")}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls, .csv" style={{ display: "none" }} />

            {file ? (
              <div className={styles.fileInfo}>
                <div className={styles.icon}>📄</div>
                <div className={styles.fileName}>{file.name}</div>
                <div className={styles.fileSize}>{(file.size / 1024).toFixed(2)} KB</div>

                <div className={styles.fileActions}>
                  <button type="button" className={styles.changeFileBtn} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    Cambiar archivo
                  </button>
                  <button type="button" className={styles.removeBtn} onClick={(e) => { e.stopPropagation(); handleClear(); }}>
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
            <button type="button" className={styles.downloadTemplateBtn} onClick={generateTemplateXLSX} disabled={processing || importing}>
              Descargar Plantilla
            </button>
            <button
              type="button"
              className={styles.importBtn}
              disabled={!file || processing || importing || validRowsCount === 0 || errorRowsCount > 0}
              onClick={handleImport}
            >
              {importing ? "Importando..." : "Importar Base de Datos"}
            </button>
          </div>

          {processing && <div className={styles.infoBox}>Leyendo y validando archivo...</div>}
          {globalErrors.length > 0 && (
            <div className={styles.errorBox}>
              {globalErrors.map((item, index) => <div key={index}>{item}</div>)}
            </div>
          )}
          {importResult && (
            <div className={importResult.success ? styles.successBox : styles.errorBox}>{importResult.message}</div>
          )}

          {summary && (
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}><span>Total</span><strong>{summary.total}</strong></div>
              <div className={styles.summaryCard}><span>Válidos</span><strong className={styles.successText}>{summary.valid}</strong></div>
              <div className={styles.summaryCard}><span>Con errores</span><strong className={styles.errorText}>{summary.errors}</strong></div>
              <div className={styles.summaryCard}><span>Deptos. nuevos</span><strong>{summary.departmentsToCreate || 0}</strong></div>
            </div>
          )}

          {validatedRows.length > 0 && (
            <div className={styles.previewCard}>
              <div className={styles.previewHeader}>
                <h3>Previsualización</h3>
                <button type="button" className={styles.clearBtn} onClick={handleClear} disabled={importing}>Limpiar</button>
              </div>

              <div className={styles.previewTableWrapper}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>Fila</th><th>Código</th><th>Descripción</th><th>Costo</th><th>Precio</th>
                      <th>Tipo</th><th>Unidad</th><th>Inventario</th><th>IVA</th><th>Global</th>
                      <th>Departamento</th><th>Stock</th><th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validatedRows.map((item) => (
                      <tr key={item.rowNumber} className={item.errors.length > 0 ? styles.rowError : styles.rowValid}>
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
                        <td>{item.product.department_id ? "Asignado" : item.department_needs_create ? `Crear: ${item.department_name}` : "Sin departamento"}</td>
                        <td>{item.product.tracks_inventory ? item.inventory.stock : "-"}</td>
                        <td>
                          {item.errors.length > 0 ? <span className={styles.errorList}>{item.errors.join(" ")}</span> : <span className={styles.successText}>OK</span>}
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
              <li>Las columnas obligatorias son: <strong>Código, Descripción, Costo, Precio, Tipo venta, Unidad, Usa inventario, IVA, Es global.</strong></li>
              <li>Departamento, Stock inicial, Stock mínimo, Stock máximo y Clave SAT son opcionales.</li>
              <li>Si no capturas Departamento, el producto se guardará sin departamento.</li>
              <li>Si capturas un Departamento que no existe, se creará automáticamente en MAYÚSCULAS.</li>
              <li><strong>Tipo de venta permitidos:</strong> unidad, granel.</li>
              <li><strong>Unidades permitidas:</strong> pieza, kg, g, l, ml, servicio.</li>
              <li><strong>Usa inventario:</strong> sí/no, true/false o 1/0.</li>
              <li><strong>Es global:</strong> sí/no, true/false o 1/0.</li>
              <li><strong>IVA permitido:</strong> 0, 8 o 16.</li>
              <li>El archivo no debe exceder los 5MB.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsImports;