import { useEffect, useMemo, useState } from "react";

import styles from "../PageOrders.module.css";
import {
  formatOrderDateTime,
  getOrderDifferenceLabel,
  getOrderStatusMeta,
} from "../utils/ordersFormatters";
import { filterOrderHistory } from "../utils/ordersCalculationService";
import { getPresetRange } from "../utils/ordersDateRange";
import { getStatusToneClass } from "../utils/ordersStatusClasses";
import { usePagination } from "../../../../../hooks/usePagination";
import PaginationBar from "../../../../PaginationBar/PaginationBar";
import BranchBadge from "./BranchBadge";
import OrdersHistoryFilters from "./OrdersHistoryFilters";
import EyeIcon from "../../../../../assets/icons/eye-solid-full.svg";
import ExportIcon from "../../../../../assets/icons/file-export-solid-full.svg";

const INITIAL_FILTERS = {
  status: "all",
  fromBranchId: "all",
  toBranchId: "all",
  dateFrom: null,
  dateTo: null,
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

  const handleFilterChange = (key, value) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleDateChange = (key, date) => {
    handleFilterChange(key, date);
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
            abrir el detalle o exportar cualquier pedido a Excel.
          </p>
        </div>
      </header>

      <OrdersHistoryFilters
        filters={filters}
        branches={branches}
        rangePreset={rangePreset}
        hasActiveFilters={hasActiveFilters}
        onFilterChange={handleFilterChange}
        onDateChange={handleDateChange}
        onRangePreset={handleRangePreset}
        onClearFilters={handleClearFilters}
      />

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
                      <div className={styles.routeCell}>
                        <BranchBadge
                          role="origin"
                          name={order.fromBranchName}
                        />
                        <BranchBadge
                          role="destination"
                          name={order.toBranchName}
                        />
                      </div>
                    </td>
                    <td>{formatOrderDateTime(order.sentAt)}</td>
                    <td>
                      <span
                        className={[
                          styles.statusBadge,
                          getStatusToneClass(styles, status.tone),
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          order.discrepancyNotes
                            ? styles.discrepancyText
                            : styles.rowSubtext
                        }
                      >
                        {getOrderDifferenceLabel(order)}
                      </span>
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
