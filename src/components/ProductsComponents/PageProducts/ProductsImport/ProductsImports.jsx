import React, { useState, useRef } from "react";
import styles from "./ProductsImports.module.css";

const ProductsImports = () => {
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleImport = () => {
    if (!file) return;
    // Aquí iría la lógica para procesar el archivo
    console.log("Importando archivo:", file.name);
    alert(`Archivo "${file.name}" listo para procesar.`);
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
            className={`${styles.dropZone} ${file ? styles.hasFile : ''}`}
            onDragOver={handleDragOver}
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
                <div className={styles.fileSize}>{(file.size / 1024).toFixed(2)} KB</div>
                <button 
                  className={styles.removeBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  Cambiar archivo
                </button>
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
            <button className={styles.downloadTemplateBtn}>
              Descargar Plantilla
            </button>
            <button 
              className={styles.importBtn} 
              disabled={!file}
              onClick={handleImport}
            >
              Importar Base de Datos
            </button>
          </div>

          <div className={styles.instructions}>
            <h3>Instrucciones importantes:</h3>
            <ul>
              <li>Descarga la plantilla para asegurar que las columnas sean correctas.</li>
              <li>Asegúrate de que no haya códigos de barras duplicados.</li>
              <li>Las columnas obligatorias son: <strong>Código, Descripción, Costo, Precio</strong>.</li>
              <li>El archivo no debe exceder los 5MB.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsImports;
