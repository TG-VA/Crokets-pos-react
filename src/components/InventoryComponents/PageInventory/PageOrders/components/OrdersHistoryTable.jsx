import { useEffect, useMemo, useState } from "react";

import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

import styles from "../PageOrders.module.css";
import {
  formatOrderDateTime,
  getOrderStatusMeta,
} from "../utils/ordersFormatters";
import { filterOrderHistory } from "../utils/ordersCalculationService";
import { usePagination } from "../../../../../hooks/usePagination";
import PaginationBar from "../../../../PaginationBar/PaginationBar";
import EyeIcon from "../../../../../assets/icons/eye-solid-full.svg";
import ExportIcon from "../../../../../assets/icons/file-export-solid-full.svg";
import CloseIcon from "../../../../../assets/icons/xmark-solid-full.svg";

const DATE_FORMAT = "dd/MM/yyyy";

const DATE_PRESETS = [
  { id: "today", label: "Hoy" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mes" },
];

const STATUS_CLASS = {
  pending: styles.statusPending,
  success: styles.statusSuccess,
  warning: styles.statusWarning,
  danger: styles.statusDanger,
  neutral: styles.statusPending,
};

const INITIAL_FILTERS = {
  status: "all",
  fromBranchId: "all",
  toBranchId: "all",
  dateFrom: null,
  dateTo: null,
};

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const getPresetRange = (preset, referenceDate = new Date()) => {
  if (preset === "week") {
    const dateFrom = startOfDay(referenceDate);
    const weekdayOffset = (dateFrom.getDay() + 6) % 7;

    dateFrom.setDate(dateFrom.getDate() - weekdayOffset);

    const dateTo = endOfDay(dateFrom);
    dateTo.setDate(dateTo.getDate() + 6);

    return { dateFrom, dateTo };
  }

  if (preset === "month") {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();

    return {
      dateFrom: new Date(year, month, 1, 0, 0, 0, 0),
      dateTo: new Date(year, month + 1, 0, 23, 59, 59, 999),
    };
  }

  return {
    dateFrom: startOfDay(referenceDate),
    dateTo: endOfDay(referenceDate),
  };
};

const OrdersHistoryTable = ({
  orders = [],
  branches = [],
  onOpenDetail,
  onOpenPrint,
}) => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [rangePreset, setRangePreset] = useState("custom");

  const filteredOrders = useMemo(
    () => filterOrderHistory(orders, filters),
    [filters, orders]
  );

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.fromBranchId !== "all" ||
    filters.toBranchId !== "all" ||
    filters.dateFrom !== null ||
    filters.dateTo !== null;

  const {
    currentPage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    pageItems,
    resetPagination,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination({
    totalItems: filteredOrders.length,
    defaultPageSize: 10,
    pageSizeOptions: [10, 25, 50],
    storageKey: "crokets_orders_history_page_size",
  });

  useEffect(() => {
    resetPagination();
  }, [filters, resetPagination]);

  const paginatedOrders = pageItems(filteredOrders);

  const updateFilter = (key, value) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleDateChange = (key, date) => {
    updateFilter(key, date);
    setRangePreset("custom");
  };

  const handleRangePreset = (preset) => {
    setFilters((previous) => ({
      ...previous,
      ...getPresetRange(preset),
    }));
    setRangePreset(preset);
  };

  const handleClearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setRangePreset("custom");
  };

  return (
    <section
      className={styles.workspace}
      role="tabpanel"
      id="panel-history"
      aria-labelledby="tab-history"
      tabIndex={0}
    >
      <header className={styles.workspaceHeader}>
        <div>
          <p className={styles.eyebrow}>Historial</p>
          <h2 className={styles.workspaceTitle}>Pedidos registrados</h2>
          <p className={styles.workspaceDescription}>
            Consulta pedidos por estado, sucursal o rango de fechas. Puedes
            abrir el detalle o imprimir cualquier pedido.
          </p>
        </div>
      </header>

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
              onChange={(event) => updateFilter("status", event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="accepted">Aceptado</option>
              <option value="accepted_with_difference">
                Aceptado con diferencia
              </option>
              <option value="cancelled">Cancelado</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Origen</span>
            <select
              value={filters.fromBranchId}
              onChange={(event) =>
                updateFilter("fromBranchId", event.target.value)
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
              onChange={(event) =>
                updateFilter("toBranchId", event.target.value)
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
        </div>

        <div className={styles.filterGroupRight}>
          <label className={styles.dateField}>
            <span>Desde</span>
            <DatePicker
              selected={filters.dateFrom}
              onChange={(date) => handleDateChange("dateFrom", date)}
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
              onChange={(date) => handleDateChange("dateTo", date)}
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
                onClick={() => handleRangePreset(preset.id)}
                aria-pressed={rangePreset === preset.id}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={styles.clearFiltersButton}
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
          >
            <img src={CloseIcon} alt="" aria-hidden="true" />
            Limpiar filtros
          </button>
        </div>
      </div>

      <p className={styles.resultsCount}>
        {filteredOrders.length} de {orders.length} pedidos
      </p>

      {filteredOrders.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>Sin pedidos para los filtros seleccionados</h3>
          <p>Ajusta los filtros o limpia la busqueda para ver el historial.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Pedido</th>
                <th>Ruta</th>
                <th>Enviado</th>
                <th>Estado</th>
                <th>Diferencia</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => {
                const status = getOrderStatusMeta(order.status);

                return (
                  <tr key={order.id}>
                    <td className={styles.folioCell}>{order.orderNumber}</td>
                    <td>
                      <strong>{order.orderName}</strong>
                      <span className={styles.rowSubtext}>
                        {order.departments.join(", ") || "Sin departamento"}
                      </span>
                    </td>
                    <td>
                      {order.toBranchName}
                      <span className={styles.rowSubtext}>
                        desde {order.fromBranchName}
                      </span>
                    </td>
                    <td>{formatOrderDateTime(order.sentAt)}</td>
                    <td>
                      <span
                        className={[
                          styles.statusBadge,
                          STATUS_CLASS[status.tone] || STATUS_CLASS.neutral,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td>
                      {order.discrepancyNotes ? (
                        <span className={styles.discrepancyText}>
                          {order.discrepancyNotes}
                        </span>
                      ) : (
                        <span className={styles.rowSubtext}>
                          Sin diferencia
                        </span>
                      )}
                    </td>
                    <td className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => onOpenDetail(order)}
                        aria-label={`Ver detalle de ${order.orderNumber}`}
                      >
                        <img
                          src={EyeIcon}
                          alt=""
                          aria-hidden="true"
                          className={styles.actionEyeIcon}
                        />
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => onOpenPrint?.(order)}
                        aria-label={`Exportar ${order.orderNumber}`}
                      >
                        <img
                          src={ExportIcon}
                          alt=""
                          aria-hidden="true"
                          className={styles.actionExportIcon}
                        />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredOrders.length > 0 ? (
        <div className={styles.paginationFooter}>
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={[10, 25, 50]}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            totalItems={filteredOrders.length}
            startIndex={startIndex}
            endIndex={endIndex}
            itemsNoun="pedidos"
            labelMode="range"
          />
        </div>
      ) : null}
    </section>
  );
};

export default OrdersHistoryTable;
