import React from "react";
import styles from "../PageTransfers.module.css";
import { formatTransferDateTime } from "../utils/transfersUtils";
import boxIcon from "../../../../../assets/icons/box-solid-full.svg";
import tableListIcon from "../../../../../assets/icons/table-list-solid-full.svg";

const ReceiveWorkspace = ({
  submitting,
  pendingReceiptsCount,
  pendingReceiptOrders,
  selectedReceiptOrder,
  receiptQuantities,
  onSelectReceiptOrder,
  onReceiptQuantityChange,
  onConfirmReceipt,
}) => {
  return (
    <section className={styles.workspace}>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>Recepciones pendientes</h2>
            <p className={styles.panelText}>
              Selecciona una orden para capturar lo recibido realmente en
              sucursal.
            </p>
          </div>

          <div className={styles.pendingIndicator}>
            {pendingReceiptsCount} pendientes
          </div>
        </div>

        <div className={styles.orderList}>
          {pendingReceiptOrders.map((order) => (
            <button
              key={order.id}
              type="button"
              className={`${styles.orderCard}${
                selectedReceiptOrder?.id === order.id
                  ? ` ${styles.orderCardActive}`
                  : ""
              }`}
              onClick={() => onSelectReceiptOrder(order.id)}
            >
              <div className={styles.orderTopRow}>
                <strong>{order.folio}</strong>
                <span className={styles.inlineBadge}>
                  {order.totals.requestedUnits} pzas
                </span>
              </div>
              <span>{order.originBranchName}</span>
              <span>{formatTransferDateTime(order.createdAt)}</span>
            </button>
          ))}

          {pendingReceiptOrders.length === 0 ? (
            <div className={styles.emptyState}>
              <img
                src={boxIcon}
                alt=""
                aria-hidden="true"
                className={styles.emptyStateIcon}
              />
              <span>
                No tienes órdenes pendientes por recibir en esta sucursal.
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>Orden de recepción</h2>
            <p className={styles.panelText}>
              Captura la cantidad que llegó; cualquier faltante regresa
              automáticamente a la sucursal origen.
            </p>
          </div>
        </div>

        {selectedReceiptOrder ? (
          <>
            <div className={styles.receiptMeta}>
              <div>
                <span className={styles.metaLabel}>Folio</span>
                <strong>{selectedReceiptOrder.folio}</strong>
              </div>
              <div>
                <span className={styles.metaLabel}>Origen</span>
                <strong>{selectedReceiptOrder.originBranchName}</strong>
              </div>
              <div>
                <span className={styles.metaLabel}>Creado</span>
                <strong>
                  {formatTransferDateTime(selectedReceiptOrder.createdAt)}
                </strong>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Solicitado</th>
                    <th>Recibido</th>
                    <th>Regresa</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReceiptOrder.items.map((item) => {
                    const requestedQty = Number(item.requestedQty ?? 0);
                    const receivedQty = Number(
                      receiptQuantities[item.productId] ?? requestedQty
                    );
                    const normalizedReceivedQty = Number.isFinite(receivedQty)
                      ? receivedQty
                      : 0;
                    const returnedQty = Math.max(
                      0,
                      requestedQty - normalizedReceivedQty
                    );

                    return (
                      <tr key={item.productId}>
                        <td>
                          <div className={styles.productCell}>
                            <strong>{item.name}</strong>
                            <span>{item.barcode}</span>
                          </div>
                        </td>
                        <td>{requestedQty}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max={requestedQty}
                            className={styles.quantityInput}
                            value={
                              receiptQuantities[item.productId] ??
                              String(requestedQty)
                            }
                            onChange={(event) =>
                              onReceiptQuantityChange(
                                item.productId,
                                event.target.value
                              )
                            }
                          />
                        </td>
                        <td>{returnedQty}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.actionRow}>
              <div className={styles.actionText}>
                La recepción genera entradas automáticas en destino y reingresa
                el faltante a origen.
              </div>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={onConfirmReceipt}
                disabled={submitting}
              >
                {submitting ? "Procesando..." : "Confirmar recepción"}
              </button>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <img
              src={tableListIcon}
              alt=""
              aria-hidden="true"
              className={styles.emptyStateIcon}
            />
            <span>
              Selecciona una orden pendiente para abrir el detalle de recepción.
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

export default ReceiveWorkspace;
