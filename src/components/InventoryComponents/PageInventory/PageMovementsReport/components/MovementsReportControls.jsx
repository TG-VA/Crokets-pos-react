import React from "react";
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

import { joinClasses } from "../utils/movementFormatters";

import styles from "./MovementsReportControls.module.css";

const RANGE_PRESETS = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
];

const MovementsReportControls = ({
  startDateValue = null,
  endDateValue = null,
  rangePreset = "custom",

  branchOptions = [],
  selectedBranchId = "",
  exporting = false,
  canExport = true,

  onStartDateChange,
  onEndDateChange,
  onSelectRangePreset,
  onBranchChange,
  onExport,
}) => {
  return (
    <div className={styles.controls}>
      <div className={styles.rangeControls}>
        <div className={styles.controlGroup}>
          <label className={styles.label}>Desde</label>

          <DatePicker
            selected={startDateValue}
            onChange={(date) => {
              onStartDateChange?.(date);
            }}
            selectsStart
            startDate={startDateValue}
            endDate={endDateValue}
            maxDate={endDateValue || new Date()}
            dateFormat="dd/MM/yyyy"
            className={styles.dateInput}
            calendarClassName={styles.datePickerCalendar}
            popperClassName={styles.datePickerPopper}
            wrapperClassName={styles.datePickerWrapper}
            showPopperArrow={false}
          />
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.label}>Hasta</label>

          <DatePicker
            selected={endDateValue}
            onChange={(date) => {
              onEndDateChange?.(date);
            }}
            selectsEnd
            startDate={startDateValue}
            endDate={endDateValue}
            minDate={startDateValue}
            maxDate={new Date()}
            dateFormat="dd/MM/yyyy"
            className={styles.dateInput}
            calendarClassName={styles.datePickerCalendar}
            popperClassName={styles.datePickerPopper}
            wrapperClassName={styles.datePickerWrapper}
            showPopperArrow={false}
          />
        </div>

        <div className={styles.quickActions}>
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={joinClasses(
                styles.quickButton,
                rangePreset === preset.value && styles.quickButtonActive
              )}
              onClick={() => {
                onSelectRangePreset?.(preset.value);
              }}
              aria-pressed={rangePreset === preset.value}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.controlGroup}>
        <label className={styles.label}>Sucursal</label>

        <select
          className={styles.select}
          value={selectedBranchId}
          onChange={(event) => {
            onBranchChange?.(event.target.value);
          }}
        >
          {branchOptions.map((branch) => {
            const branchLabel = branch?.code
              ? `${branch.name} (${branch.code})`
              : branch?.name;

            return (
              <option key={branch.id} value={branch.id}>
                {branchLabel}
              </option>
            );
          })}
        </select>
      </div>

      <button
        type="button"
        className={styles.exportButton}
        onClick={() => {
          onExport?.();
        }}
        disabled={exporting || !canExport}
      >
        {exporting ? "Exportando..." : "Exportar movimientos"}
      </button>
    </div>
  );
};

export default MovementsReportControls;
