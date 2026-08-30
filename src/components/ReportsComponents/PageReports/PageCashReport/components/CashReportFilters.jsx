import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./CashComponents.module.css";

const CashReportFilters = ({
  branchesList = [],
  selectedBranchId = "ALL",
  setSelectedBranchId,
  cashiersList = [],
  selectedCashierId = "ALL",
  setSelectedCashierId,
  sessionStatus = "ALL",
  setSessionStatus,
  movementType = "ALL",
  setMovementType,
  dateRange = [null, null],
  setDateRange,
  startDate,
  endDate,
  setQuickDatePreset,
  activeTab = "sessions",
}) => {
  return (
    <div className={styles.filtersWrapper}>
      <div className={styles.filtersToolbar}>
        {/* Rango de Fechas */}
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Rango de Fechas:</label>
          <div className={styles.datePickerWrapper}>
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              dateFormat="dd/MM/yyyy"
              className={styles.datePickerInput}
              placeholderText="Seleccionar rango..."
            />
          </div>
        </div>

        {/* Píldoras de Rango Rápido */}
        <div className={styles.presetsInlineGroup}>
          <button
            type="button"
            className={styles.presetPill}
            onClick={() => setQuickDatePreset("today")}
          >
            Hoy
          </button>
          <button
            type="button"
            className={styles.presetPill}
            onClick={() => setQuickDatePreset("this_week")}
          >
            Esta semana
          </button>
          <button
            type="button"
            className={styles.presetPill}
            onClick={() => setQuickDatePreset("this_month")}
          >
            Este mes
          </button>
        </div>

        <div className={styles.verticalDivider} />

        {/* Sucursal */}
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

        {/* Cajero */}
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Cajero / Usuario:</label>
          <select
            value={selectedCashierId}
            onChange={(e) => setSelectedCashierId(e.target.value)}
            className={styles.selectInput}
          >
            <option value="ALL">Todos los cajeros</option>
            {cashiersList.map((c) => (
              <option key={c.id} value={c.id}>
                {String(c.username || "").toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Estado de Turno (Pestañas de sesiones o auditoría) */}
        {(activeTab === "sessions" || activeTab === "audit") && (
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Estado Turno:</label>
            <select
              value={sessionStatus}
              onChange={(e) => setSessionStatus(e.target.value)}
              className={styles.selectInput}
            >
              <option value="ALL">Todos los estados</option>
              <option value="closed">Solo Cerradas</option>
              <option value="open">Solo Abiertas (En curso)</option>
            </select>
          </div>
        )}

        {/* Tipo de movimiento (Pestaña de movimientos) */}
        {activeTab === "movements" && (
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Tipo de Movimiento:</label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className={styles.selectInput}
            >
              <option value="ALL">Todos los movimientos</option>
              <option value="entry">Solo Ingresos / Entradas</option>
              <option value="exit">Solo Retiros / Salidas</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashReportFilters;
