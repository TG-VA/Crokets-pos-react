import { useState } from "react";

import PaginationBar from "../../../../PaginationBar/PaginationBar";
import { usePagination } from "../../../../../hooks/usePagination";
import styles from "../PageTransfers.module.css";
import {
  formatTransferDateTime,
  normalizeReceivedQuantity,
} from "../utils/transfersUtils";
import boxIcon from "../../../../../assets/icons/box-solid-full.svg";
import tableListIcon from "../../../../../assets/icons/table-list-solid-full.svg";

const RECEIPT_PAGE_SIZE = 5;

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
  const receiptItems = selectedReceiptOrder?.items ?? [];

  const {
    currentPage,
    totalPages,
    pageSize,
    pageItems,
    handlePageChange,
    resetPagination,
  } = usePagination({
    totalItems: receiptItems.length,
    defaultPageSize: RECEIPT_PAGE_SIZE,
    pageSizeOptions: [RECEIPT_PAGE_SIZE],
  });

  // Cada orden arranca en la primera pagina de productos.
  const [paginatedOrderId, setPaginatedOrderId] = useState(
    selectedReceiptOrder?.id ?? ""
  );

  const currentOrderId = selectedReceiptOrder?.id ?? "";

  if (currentOrderId !== paginatedOrderId) {
    setPaginatedOrderId(currentOrderId);
    resetPagination();
  }

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
                  {pageItems(receiptItems).map((item) => {
                    const requestedQty = Number(item.requestedQty ?? 0);
                    const receivedQty = Number(
                      receiptQuantities[item.productId] ?? 0
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
                            type="text"
                            inputMode="numeric"
                            className={styles.quantityInput}
                            aria-label={`Cantidad recibida de ${item.name}`}
                            value={receiptQuantities[item.productId] ?? "0"}
                            onChange={(event) =>
                              onReceiptQuantityChange(
                                item.productId,
                                normalizeReceivedQuantity(
                                  event.target.value,
                                  requestedQty
                                )
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

            {totalPages > 1 ? (
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={receiptItems.length}
                pageSize={pageSize}
                itemsNoun="productos"
                onPageChange={handlePageChange}
              />
            ) : null}

            <div className={styles.actionRow}>
              <div className={styles.actionText}>
                La recepción genera entradas automáticas en destino y reingresa
                el faltante a origen.
                <span className={styles.confirmHint}>
                  Doble click para confirmar
                </span>
              </div>

              <button
                type="button"
                className={styles.primaryButton}
                onDoubleClick={onConfirmReceipt}
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
