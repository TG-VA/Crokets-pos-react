import PaginationBar from "../../../../PaginationBar/PaginationBar";
import { usePagination } from "../../../../../hooks/usePagination";
import styles from "../PageTransfers.module.css";
import useTransferHistoryFilters from "../hooks/useTransferHistoryFilters";
import HistoryFilters from "./HistoryFilters";
import {
  formatTransferDateTime,
  getTransferStatusMetaForBranch,
} from "../utils/transfersUtils";

const HistoryTable = ({
  branch,
  transferHistory,
  cancellableTransferIds,
  submitting,
  cancelConfirmLoading,
  onRowClick,
  onCancelClick,
}) => {
  const filters = useTransferHistoryFilters({ transferHistory });

  const {
    filteredHistory,
    dateRange,
    rangePreset,
    folioSearch,
    hasActiveFilters,
    emptyMessage,
  } = filters;

  const {
    currentPage,
    totalPages,
    pageSize,
    pageItems,
    handlePageChange,
    resetPagination,
  } = usePagination({ totalItems: filteredHistory.length });

  // El reset de pagina ocurre en el mismo evento que el cambio de filtro para
  // evitar el re-render en cascada que provocaba el efecto equivalente.
  const handleDateChange = (key, date) => {
    filters.handleDateChange(key, date);
    resetPagination();
  };

  const handleRangePreset = (preset) => {
    filters.handleRangePreset(preset);
    resetPagination();
  };

  const handleClearFilters = () => {
    filters.handleClearFilters();
    resetPagination();
  };

  const handleFolioSearchChange = (value) => {
    filters.handleFolioSearchChange(value);
    resetPagination();
  };

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelHeading}>
          <h2 className={styles.panelTitle}>Historial de traspasos</h2>
          <p className={styles.panelText}>
            Consulta envíos, recepciones completas y órdenes con diferencias
            relacionadas con esta sucursal.
          </p>
        </div>

        <div className={styles.panelHeaderActions}>
          <HistoryFilters
            dateFrom={dateRange.dateFrom}
            dateTo={dateRange.dateTo}
            rangePreset={rangePreset}
            hasActiveFilters={hasActiveFilters}
            onDateChange={handleDateChange}
            onRangePreset={handleRangePreset}
            onClearFilters={handleClearFilters}
          />

          <input
            type="search"
            className={`${styles.input} ${styles.historySearch}`}
            placeholder="Buscar por folio"
            aria-label="Buscar traspaso por folio"
            value={folioSearch}
            onChange={(event) => handleFolioSearchChange(event.target.value)}
          />
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Folio</th>
              <th>Ruta</th>
              <th>Estado</th>
              <th>Solicitado</th>
              <th>Recibido</th>
              <th>Devuelto</th>
              <th>Creado</th>
              <th>Recepción</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageItems(filteredHistory).map((order) => {
              const statusMeta = getTransferStatusMetaForBranch(
                order,
                branch?.id
              );

              return (
                <tr
                  key={order.id}
                  tabIndex={0}
                  role="row"
                  aria-label={`Traspaso ${order.folio} de ${order.originBranchName} a ${order.destinationBranchName}. Estado: ${statusMeta.label}. Creado el ${formatTransferDateTime(order.createdAt)}. Presiona Enter o Espacio para ver el detalle.`}
                  className={styles.clickableRow}
                  onClick={(event) => onRowClick(order, event)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") {
                      return;
                    }

                    const target = event?.target;
                    if (target && target.closest("td:last-child")) {
                      return;
                    }

                    event.preventDefault();
                    onRowClick(order, event);
                  }}
                  title="Clic para ver el detalle de productos del traspaso"
                >
                  <td>
                    <div className={styles.productCell}>
                      <strong>{order.folio}</strong>
                      <span>{order.createdByUsername}</span>
                    </div>
                  </td>
                  <td>
                    {order.originBranchName} → {order.destinationBranchName}
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        styles[`status${statusMeta.tone}`]
                      }`}
                    >
                      {statusMeta.label}
                    </span>
                  </td>
                  <td>{order.totals.requestedUnits}</td>
                  <td>{order.totals.receivedUnits}</td>
                  <td>{order.totals.returnedUnits}</td>
                  <td>{formatTransferDateTime(order.createdAt)}</td>
                  <td>{formatTransferDateTime(order.receivedAt)}</td>
                  <td>
                    {cancellableTransferIds.has(order.id) ? (
                      <button
                        type="button"
                        className={styles.cancelRowButton}
                        onClick={() => onCancelClick(order)}
                        disabled={submitting || cancelConfirmLoading}
                      >
                        Cancelar
                      </button>
                    ) : (
                      <span className={styles.noActionText}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan="9" className={styles.emptyRow}>
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredHistory.length}
          pageSize={pageSize}
          itemsNoun="traspasos"
          onPageChange={handlePageChange}
        />
      ) : null}
    </section>
  );
};

export default HistoryTable;
