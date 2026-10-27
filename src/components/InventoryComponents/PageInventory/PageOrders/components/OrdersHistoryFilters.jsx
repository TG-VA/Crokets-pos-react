import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

import styles from "../PageOrders.module.css";
import {
  ORDER_ITEM_STATUS_FILTER_OPTIONS,
  ORDER_STATUS_FILTER_OPTIONS,
} from "../utils/ordersFormatters";
import CloseIcon from "../../../../../assets/icons/xmark-solid-full.svg";

const DATE_FORMAT = "dd/MM/yyyy";

const DATE_PRESETS = [
  { id: "today", label: "Hoy" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mes" },
];

const OrdersHistoryFilters = ({
  filters,
  branches = [],
  isDestinationLocked = false,
  rangePreset = "custom",
  hasActiveFilters = false,
  onFilterChange,
  onDateChange,
  onRangePreset,
  onClearFilters,
}) => (
  <div
    className={styles.filterBar}
    role="group"
    aria-label="Filtros de pedidos"
  >
    <div className={styles.filterGroup}>
      <label className={styles.field}>
        <span>Estado</span>
        <select
          value={filters.status}
          onChange={(event) => onFilterChange("status", event.target.value)}
        >
          {ORDER_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Estado del producto</span>
        <select
          value={filters.itemStatus}
          onChange={(event) => onFilterChange("itemStatus", event.target.value)}
        >
          {ORDER_ITEM_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Origen</span>
        <select
          value={filters.fromBranchId}
          onChange={(event) =>
            onFilterChange("fromBranchId", event.target.value)
          }
        >
          <option value="all">Todas</option>
          {branches.map((branchOption) => (
            <option key={branchOption.id} value={branchOption.id}>
              {branchOption.name}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Destino</span>
        <select
          value={filters.toBranchId}
          disabled={isDestinationLocked}
          aria-disabled={isDestinationLocked}
          onChange={(event) => onFilterChange("toBranchId", event.target.value)}
        >
          <option value="all">Todas</option>
          {branches.map((branchOption) => (
            <option key={branchOption.id} value={branchOption.id}>
              {branchOption.name}
            </option>
          ))}
        </select>
      </label>
    </div>

    <div className={styles.filterGroupRight}>
      <label className={styles.dateField}>
        <span>Desde</span>
        <DatePicker
          selected={filters.dateFrom}
          onChange={(date) => onDateChange("dateFrom", date)}
          selectsStart
          startDate={filters.dateFrom}
          endDate={filters.dateTo}
          maxDate={filters.dateTo || new Date()}
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
          selected={filters.dateTo}
          onChange={(date) => onDateChange("dateTo", date)}
          selectsEnd
          startDate={filters.dateFrom}
          endDate={filters.dateTo}
          minDate={filters.dateFrom}
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
        disabled={!hasActiveFilters}
      >
        <img src={CloseIcon} alt="" aria-hidden="true" />
        Limpiar filtros
      </button>
    </div>
  </div>
);

export default OrdersHistoryFilters;
