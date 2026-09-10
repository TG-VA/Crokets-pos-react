import React from "react";
import styles from "../PageTransfers.module.css";
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
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>Historial de traspasos</h2>
          <p className={styles.panelText}>
            Consulta envíos, recepciones completas y órdenes con
            diferencias relacionadas con esta sucursal.
          </p>
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
              <th>Recibido</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {transferHistory.map((order) => {
              const statusMeta = getTransferStatusMetaForBranch(
                order,
                branch?.id
              );

              return (
                <tr
                  key={order.id}
                  className={styles.clickableRow}
                  onClick={(event) => onRowClick(order, event)}
                  title="Clic para ver el detalle de productos del traspaso"
                >
                  <td>
                    <div className={styles.productCell}>
                      <strong>{order.folio}</strong>
                      <span>{order.createdByUsername}</span>
                    </div>
                  </td>
                  <td>
                    {order.originBranchName} →{" "}
                    {order.destinationBranchName}
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
                        className={styles.ghostButton}
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

            {transferHistory.length === 0 ? (
              <tr>
                <td colSpan="9" className={styles.emptyRow}>
                  Todavía no hay traspasos registrados para esta
                  sucursal.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default HistoryTable;
