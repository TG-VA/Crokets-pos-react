import { useEffect, useMemo, useState } from "react";

import styles from "../PageOrders.module.css";
import {
  formatOrderDateTime,
  getOrderStatusMeta,
} from "../utils/ordersFormatters";
import { filterOrderHistory } from "../utils/ordersCalculationService";
import { usePagination } from "../../../../../hooks/usePagination";
import PaginationBar from "../../../../PaginationBar/PaginationBar";
import EyeIcon from "../../../../../assets/icons/eye-solid-full.svg";
import PrintIcon from "../../../../../assets/icons/print-solid-full.svg";

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
  dateFrom: "",
  dateTo: "",
};

const OrdersHistoryTable = ({
  orders = [],
  branches = [],
  onOpenDetail,
  onOpenPrint,
}) => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const filteredOrders = useMemo(
    () => filterOrderHistory(orders, filters),
    [filters, orders]
  );

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

        <button
          type="button"
          className={styles.ghostButton}
          onClick={() => setFilters(INITIAL_FILTERS)}
        >
          Limpiar filtros
        </button>
      </header>

      <div className={styles.filterBar}>
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
            onChange={(event) => updateFilter("toBranchId", event.target.value)}
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
          <span>Desde</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => updateFilter("dateFrom", event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Hasta</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) => updateFilter("dateTo", event.target.value)}
          />
        </label>
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
                      {order.fromBranchName}
                      <span className={styles.rowSubtext}>
                        hacia {order.toBranchName}
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
                        <img src={EyeIcon} alt="" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => onOpenPrint(order)}
                        aria-label={`Imprimir ${order.orderNumber}`}
                      >
                        <img src={PrintIcon} alt="" aria-hidden="true" />
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
