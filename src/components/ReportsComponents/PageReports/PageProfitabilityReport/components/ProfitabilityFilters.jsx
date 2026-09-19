/**
 * ProfitabilityFilters.jsx
 * Barra de filtros para el Reporte de Rentabilidad: fechas, sucursal, departamento y búsqueda.
 */

import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./ProfitabilityComponents.module.css";

import searchIcon from "../../../../../assets/icons/searchIcon.svg";
import rotateLeftIcon from "../../../../../assets/icons/rotate-left-solid-full.svg";
import xmarkIcon from "../../../../../assets/icons/xmark-solid-full.svg";

const ProfitabilityFilters = ({
  branchesList = [],
  selectedBranchId = "ALL",
  setSelectedBranchId,
  departmentsList = [],
  selectedDepartmentId = "ALL",
  setSelectedDepartmentId,
  startDate,
  endDate,
  setDateRange,
  activeDatePreset = "this_month",
  setQuickDatePreset,
  searchTerm = "",
  setSearchTerm,
  onClear,
}) => {
  const hasActiveFilters = Boolean(
    (searchTerm || "").trim() ||
    (selectedBranchId && selectedBranchId !== "ALL") ||
    (selectedDepartmentId && selectedDepartmentId !== "ALL") ||
    activeDatePreset !== "this_month"
  );

  return (
    <div className={styles.filtersWrapper}>
      <div className={styles.filtersToolbar}>
        {/* Selector de Rango de Fechas */}
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Rango de Fechas:</label>
          <div className={styles.datePickerWrapper}>
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              maxDate={new Date()}
              onChange={(update) => setDateRange(update)}
              dateFormat="dd/MM/yyyy"
              className={styles.datePickerInput}
              placeholderText="Seleccionar periodo..."
            />
          </div>
        </div>

        {/* Píldoras de Preset Rápido */}
        <div className={styles.presetsInlineGroup}>
          <button
            type="button"
            className={`${styles.presetPill} ${
              activeDatePreset === "today" ? styles.presetPillActive : ""
            }`.trim()}
            onClick={() => setQuickDatePreset("today")}
          >
            Hoy
          </button>
          <button
            type="button"
            className={`${styles.presetPill} ${
              activeDatePreset === "yesterday" ? styles.presetPillActive : ""
            }`.trim()}
            onClick={() => setQuickDatePreset("yesterday")}
          >
            Ayer
          </button>
          <button
            type="button"
            className={`${styles.presetPill} ${
              activeDatePreset === "this_week" ? styles.presetPillActive : ""
            }`.trim()}
            onClick={() => setQuickDatePreset("this_week")}
          >
            Esta semana
          </button>
          <button
            type="button"
            className={`${styles.presetPill} ${
              activeDatePreset === "this_month" ? styles.presetPillActive : ""
            }`.trim()}
            onClick={() => setQuickDatePreset("this_month")}
          >
            Este mes
          </button>
          <button
            type="button"
            className={`${styles.presetPill} ${
              activeDatePreset === "last_month" ? styles.presetPillActive : ""
            }`.trim()}
            onClick={() => setQuickDatePreset("last_month")}
          >
            Mes pasado
          </button>
        </div>

        {/* Selector de Sucursal */}
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Sucursal:</label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className={styles.selectInput}
          >
            <option value="ALL">Todas las sucursales</option>
            {branchesList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Departamento */}
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Departamento:</label>
          <select
            value={selectedDepartmentId}
            onChange={(e) => setSelectedDepartmentId(e.target.value)}
            className={styles.selectInput}
          >
            <option value="ALL">Todos los departamentos</option>
            {departmentsList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Buscador en tiempo real con botón limpiar búsqueda */}
        <div className={`${styles.filterField} ${styles.filterFieldGrow}`.trim()}>
          <label className={styles.filterLabel}>Buscar Producto:</label>
          <div className={styles.searchWrapper}>
            <img src={searchIcon} alt="" className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por nombre o código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${styles.searchInput} ${styles.searchInputWithIcon}`.trim()}
            />
            {Boolean(searchTerm) && (
              <button
                type="button"
                className={styles.searchClearBtn}
                onClick={() => setSearchTerm("")}
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
          <img src={rotateLeftIcon} alt="" />
          Limpiar
          {hasActiveFilters && <span className={styles.activeFilterDot} />}
        </button>
      </div>
    </div>
  );
};

export default ProfitabilityFilters;
