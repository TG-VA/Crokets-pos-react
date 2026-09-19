import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./CommissionsComponents.module.css";
import resetIcon from "../../../../../assets/icons/rotate-left-solid-full.svg";
import searchIcon from "../../../../../assets/icons/searchIcon.svg";
import clearIcon from "../../../../../assets/icons/xmark-solid-full.svg";

const DATE_PRESETS = [
  { id: "today", label: "Hoy" },
  { id: "yesterday", label: "Ayer" },
  { id: "this_week", label: "Esta semana" },
  { id: "this_fortnight", label: "Esta quincena" },
  { id: "this_month", label: "Este mes" },
  { id: "last_month", label: "Mes anterior" },
];

export const CommissionsReportFilters = ({
  startDate,
  endDate,
  handleDateRangeChange,
  activeDatePreset,
  setQuickDatePreset,
  branchesList = [],
  selectedBranchId = "ALL",
  setSelectedBranchId,
  cashiersList = [],
  selectedCashierId = "ALL",
  setSelectedCashierId,
  departmentsList = [],
  selectedDepartmentId = "ALL",
  setSelectedDepartmentId,
  selectedDiscountFilter = "ALL",
  setSelectedDiscountFilter,
  searchTerm = "",
  setSearchTerm,
  hasActiveFilters = false,
  activeFiltersCount = 0,
  handleClearFilters,
}) => {
  return (
    <div className={styles.filtersWrapper}>
      {/* Fila 1: Filtros de Fecha, Presets y Botón Limpiar */}
      <div className={styles.filtersTopRow}>
        <div className={styles.dateFilterGroup}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Rango de Fechas:</label>
            <div className={styles.datePickerWrapper}>
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                maxDate={new Date()}
                onChange={handleDateRangeChange}
                dateFormat="dd/MM/yyyy"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                className={styles.datePickerInput}
                placeholderText="Seleccionar periodo..."
              />
            </div>
          </div>

          <div className={styles.presetsInlineGroup}>
            {DATE_PRESETS.map((preset) => {
              const isActive = activeDatePreset === preset.id;
              const buttonClass = `${styles.presetPill} ${
                isActive ? styles.presetPillActive : ""
              }`.trim();

              return (
                <button
                  key={preset.id}
                  type="button"
                  className={buttonClass}
                  onClick={() => setQuickDatePreset(preset.id)}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className={`${styles.clearBtn} ${
            hasActiveFilters ? styles.clearBtnActive : ""
          }`.trim()}
          onClick={handleClearFilters}
          title="Restablecer todos los filtros"
        >
          <img
            src={resetIcon}
            alt="Limpiar filtros"
            className={styles.clearBtnIcon}
          />
          <span>
            {activeFiltersCount > 0 ? `Limpiar (${activeFiltersCount})` : "Limpiar"}
          </span>
          {hasActiveFilters && <span className={styles.activeFilterDot} />}
        </button>
      </div>

      {/* Fila 2: Sucursal, Cajero, Departamento, Descuento y Búsqueda */}
      <div className={styles.filtersBottomRow}>
        <div className={`${styles.filterField} ${styles.filterFieldGrow}`}>
          <label className={styles.filterLabel}>Sucursal:</label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className={styles.selectInput}
          >
            <option value="ALL">Todas las sucursales</option>
            {branchesList.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <div className={`${styles.filterField} ${styles.filterFieldGrow}`}>
          <label className={styles.filterLabel}>Cajero / Usuario:</label>
          <select
            value={selectedCashierId}
            onChange={(e) => setSelectedCashierId(e.target.value)}
            className={styles.selectInput}
          >
            <option value="ALL">Todos los cajeros</option>
            {cashiersList.map((cashier) => (
              <option key={cashier.id} value={cashier.id}>
                {cashier.name}
              </option>
            ))}
          </select>
        </div>

        <div className={`${styles.filterField} ${styles.filterFieldGrow}`}>
          <label className={styles.filterLabel}>Departamento:</label>
          <select
            value={selectedDepartmentId}
            onChange={(e) => setSelectedDepartmentId(e.target.value)}
            className={styles.selectInput}
          >
            <option value="ALL">Todos los departamentos</option>
            {departmentsList.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div className={`${styles.filterField} ${styles.filterFieldGrow}`}>
          <label className={styles.filterLabel}>Descuento:</label>
          <select
            value={selectedDiscountFilter}
            onChange={(e) => setSelectedDiscountFilter(e.target.value)}
            className={styles.selectInput}
          >
            <option value="ALL">Todos</option>
            <option value="WITH_DISCOUNT">Solo con descuento</option>
            <option value="WITHOUT_DISCOUNT">Sin descuento</option>
          </select>
        </div>

        <div className={`${styles.filterField} ${styles.filterFieldSearch}`}>
          <label className={styles.filterLabel}>Buscar:</label>
          <div className={styles.searchWrapper}>
            <img
              src={searchIcon}
              alt="Buscar"
              className={styles.searchIcon}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cajero, ticket, producto o código..."
              className={`${styles.searchInput} ${styles.searchInputWithIcon}`}
            />
            {searchTerm && (
              <button
                type="button"
                className={styles.searchClearBtn}
                onClick={() => setSearchTerm("")}
                title="Borrar búsqueda"
              >
                <img
                  src={clearIcon}
                  alt="Borrar"
                  className={styles.searchClearIcon}
                />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
