import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

import styles from "../PageTransfers.module.css";
import CloseIcon from "../../../../../assets/icons/xmark-solid-full.svg";

const DATE_FORMAT = "dd/MM/yyyy";

const DATE_PRESETS = [
  { id: "today", label: "Hoy" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mes" },
];

const HistoryFilters = ({
  dateFrom,
  dateTo,
  rangePreset,
  onDateChange,
  onRangePreset,
  onClearFilters,
}) => {
  const hasActiveRange = Boolean(dateFrom || dateTo);

  return (
    <div
      className={styles.historyFilters}
      role="group"
      aria-label="Filtros por rango de fechas del historial de traspasos"
    >
      <label className={styles.dateField}>
        <span>Desde</span>
        <DatePicker
          selected={dateFrom}
          onChange={(date) => onDateChange("dateFrom", date)}
          selectsStart
          startDate={dateFrom}
          endDate={dateTo}
          maxDate={dateTo || new Date()}
          dateFormat={DATE_FORMAT}
          className={styles.dateInput}
          calendarClassName={styles.datePickerCalendar}
          popperClassName={styles.datePickerPopper}
          wrapperClassName={styles.datePickerWrapper}
          showPopperArrow={false}
          placeholderText="dd/mm/aaaa"
          aria-label="Desde"
        />
      </label>

      <label className={styles.dateField}>
        <span>Hasta</span>
        <DatePicker
          selected={dateTo}
          onChange={(date) => onDateChange("dateTo", date)}
          selectsEnd
          startDate={dateFrom}
          endDate={dateTo}
          minDate={dateFrom}
          maxDate={new Date()}
          dateFormat={DATE_FORMAT}
          className={styles.dateInput}
          calendarClassName={styles.datePickerCalendar}
          popperClassName={styles.datePickerPopper}
          wrapperClassName={styles.datePickerWrapper}
          showPopperArrow={false}
          placeholderText="dd/mm/aaaa"
          aria-label="Hasta"
        />
      </label>

      <div className={styles.quickActions}>
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={[
              styles.quickButton,
              rangePreset === preset.id ? styles.quickButtonActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onRangePreset(preset.id)}
            aria-pressed={rangePreset === preset.id}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={styles.clearFiltersButton}
        onClick={onClearFilters}
        disabled={!hasActiveRange}
      >
        <img src={CloseIcon} alt="" aria-hidden="true" />
        Limpiar filtros
      </button>
    </div>
  );
};

export default HistoryFilters;
