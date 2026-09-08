import React from "react";
import styles from "./InventoryComponents.module.css";
import searchIcon from "../../../../../assets/icons/searchIcon.svg";
import rotateLeftIcon from "../../../../../assets/icons/rotate-left-solid-full.svg";
import xmarkIcon from "../../../../../assets/icons/xmark-solid-full.svg";

const InventoryReportFilters = ({
  branchesList = [],
  selectedBranchId = "ALL",
  onSelectBranch,
  loadingBranches = false,
  departments = [],
  selectedDepartment = "ALL",
  onSelectDepartment,
  selectedStockStatus = "ALL",
  onSelectStockStatus,
  searchTerm = "",
  onSearchChange,
  onClear,
  isLoading = false,
}) => {
  const hasActiveFilters = Boolean(
    (searchTerm || "").trim() ||
    (selectedBranchId && selectedBranchId !== "ALL") ||
    (selectedDepartment && selectedDepartment !== "ALL") ||
    (selectedStockStatus && selectedStockStatus !== "ALL")
  );

  return (
    <div className={styles.filtersCard}>
      <div className={styles.filterControls}>
        {/* Filtro por Sucursal */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Sucursal:</label>
          <select
            className={styles.selectInput}
            value={selectedBranchId}
            onChange={onSelectBranch}
            disabled={loadingBranches || isLoading}
          >
            <option value="ALL">Todas las sucursales</option>
            {branchesList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

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

        {/* Buscador de texto con botón borrar */}
        <div className={`${styles.filterGroup} ${styles.filterGroupSearch}`.trim()}>
          <label className={styles.filterLabel}>Buscar Producto:</label>
          <div className={styles.searchWrapper}>
            <img src={searchIcon} alt="" className={styles.searchIcon} />
            <input
              type="text"
              className={`${styles.searchInput} ${styles.searchInputWithIcon}`.trim()}
              placeholder="Buscar por código, nombre o categoría..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              disabled={isLoading}
            />
            {Boolean(searchTerm) && (
              <button
                type="button"
                className={styles.searchClearBtn}
                onClick={() => onSearchChange("")}
                title="Borrar texto de búsqueda"
              >
                <img src={xmarkIcon} alt="" className={styles.searchClearIcon} />
              </button>
            )}
          </div>
        </div>

        {/* Botón Limpiar con indicador dinámico */}
        <button
          type="button"
          onClick={onClear}
          className={`${styles.clearBtn} ${
            hasActiveFilters ? styles.clearBtnActive : ""
          }`.trim()}
          title={
            hasActiveFilters
              ? "Restablecer filtros activos"
              : "Filtros en estado predeterminado"
          }
        >
          <img src={rotateLeftIcon} alt="" className={styles.clearBtnIcon} />
          Limpiar
          {hasActiveFilters && <span className={styles.activeFilterDot} />}
        </button>
      </div>
    </div>
  );
};

export default InventoryReportFilters;

