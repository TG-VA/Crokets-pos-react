import { useState } from "react";

import PaginationBar from "../../../../PaginationBar/PaginationBar";
import styles from "../PageTransfers.module.css";
import {
  formatTransferDateTime,
  getTransferStatusMetaForBranch,
} from "../utils/transfersUtils";

const PAGE_SIZE = 10;

const HistoryTable = ({
  branch,
  transferHistory,
  cancellableTransferIds,
  submitting,
  cancelConfirmLoading,
  onRowClick,
  onCancelClick,
}) => {
  const [page, setPage] = useState(1);
  const [folioSearch, setFolioSearch] = useState("");
  const searchKey = folioSearch.trim().toLowerCase();
  const filteredHistory = searchKey
    ? transferHistory.filter((order) =>
        String(order.folio || "")
          .toLowerCase()
          .includes(searchKey)
      )
    : transferHistory;
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  // Se acota al total por si el historial se reduce (ej. al recargar).
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredHistory.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>Historial de traspasos</h2>
          <p className={styles.panelText}>
            Consulta envíos, recepciones completas y órdenes con diferencias
            relacionadas con esta sucursal.
          </p>
        </div>
        <input
          type="search"
          className={`${styles.input} ${styles.historySearch}`}
          placeholder="Buscar por folio"
          aria-label="Buscar traspaso por folio"
          value={folioSearch}
          onChange={(event) => {
            setFolioSearch(event.target.value);
            setPage(1);
          }}
        />
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
            {pageItems.map((order) => {
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
                  {searchKey
                    ? "No hay traspasos con ese folio."
                    : "Todavía no hay traspasos registrados para esta sucursal."}
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
          pageSize={PAGE_SIZE}
          itemsNoun="traspasos"
          onPageChange={setPage}
        />
      ) : null}
    </section>
  );
};

export default HistoryTable;
