import React, { useState, useRef, useEffect } from "react";
import styles from "./ReportComponents.module.css";

const ProductReportFilters = ({ 
  dateRange, 
  setDateRange, 
  onGenerate,
  onExportPDF,
  onExportExcel
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = (action) => {
    setIsMenuOpen(false);
    setTimeout(() => {
      if (action) action();
    }, 100);
  };

  return (
    <div className={styles.filtersWrapper}>
      <div className={styles.inputGroup}>
        <label>Desde:</label>
        <input 
          type="date" 
          name="startDate" 
          value={dateRange.startDate} 
          onChange={handleChange} 
          className={styles.dateInput}
        />
      </div>
      <div className={styles.inputGroup}>
        <label>Hasta:</label>
        <input 
          type="date" 
          name="endDate" 
          value={dateRange.endDate} 
          onChange={handleChange} 
          className={styles.dateInput}
        />
      </div>
      
      <div className={styles.dropdownWrapper} ref={menuRef}>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)} 
          className={styles.generateButton}
        >
          Generar Reporte
        </button>

        {isMenuOpen && (
          <div className={styles.dropdownMenu}>
            <button 
              onClick={() => handleAction(onGenerate)}
              className={`${styles.dropdownItem} ${styles.dropdownItemPrimary}`}
            >
              Consultar Datos en Pantalla
            </button>
            
            <div className={styles.dropdownDivider}></div>
            
            <button 
              onClick={() => handleAction(onExportPDF)} 
              className={styles.dropdownItem}
            >
              Imprimir PDF (Resumen Ejecutivo)
            </button>
            
            <button 
              onClick={() => handleAction(onExportExcel)} 
              className={styles.dropdownItem}
            >
              Descargar Libro Excel (.xlsx)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductReportFilters;