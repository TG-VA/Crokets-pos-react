import React from "react";
import styles from "./InventoryComponents.module.css";

const InventoryReportFilters = ({
  departments = [],
  selectedDepartment = "ALL",
  onSelectDepartment,
  selectedStockStatus = "ALL",
  onSelectStockStatus,
  searchTerm = "",
  onSearchChange,
  onExportExcel,
  isExporting = false,
  isLoading = false,
}) => {
  return (
    <div className={styles.filtersCard}>
      <div className={styles.filterControls}>
        {/* Filtro por Departamento */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Departamento:</label>
          <select
            className={styles.selectInput}
            value={selectedDepartment}
            onChange={(e) => onSelectDepartment(e.target.value)}
            disabled={isLoading}
          >
            <option value="ALL">Todos los departamentos</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Estado de Stock */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Estado de Stock:</label>
          <select
            className={styles.selectInput}
            value={selectedStockStatus}
            onChange={(e) => onSelectStockStatus(e.target.value)}
            disabled={isLoading}
          >
            <option value="ALL">Todos los estados</option>
            <option value="optimal">Óptimo</option>
            <option value="low">Stock Bajo</option>
            <option value="exhausted">Agotado</option>
            <option value="excess">Exceso de Stock</option>
            <option value="not_stocked">No Surtido</option>
          </select>
        </div>

        {/* Buscador de texto */}
        <div className={styles.filterGroupSearch}>
          <label className={styles.filterLabel}>Buscar Producto:</label>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por código, nombre o categoría..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Botón Exportar */}
      <div>
        <button
          type="button"
          className={styles.btnExport}
          onClick={onExportExcel}
          disabled={isLoading || isExporting}
        >
          {isExporting ? "Generando..." : "Exportar Excel"}
        </button>
      </div>
    </div>
  );
};

export default InventoryReportFilters;
