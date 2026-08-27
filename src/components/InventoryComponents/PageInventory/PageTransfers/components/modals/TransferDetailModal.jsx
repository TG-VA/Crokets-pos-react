import React from "react";
import AppModal from "../../../../../AppModal/AppModal";
import styles from "../../PageTransfers.module.css";
import {
  formatTransferDateTime,
  getTransferStatusMetaForBranch,
} from "../../utils/transfersUtils";

const TransferDetailModal = ({
  order,
  branch,
  products,
  onClose,
}) => {
  if (!order) return null;

  const items = Array.isArray(order?.items) ? order.items : [];
  const statusMeta = getTransferStatusMetaForBranch(order, branch?.id);

  const inventoryByProductId = new Map(
    (products || []).map((product) => {
      const productId = String(product?.id || product?.product_id || "");
      const currentStock = Number(product?.existencia ?? 0) || 0;
      return [productId, { currentStock }];
    })
  );

  const orderStatus = String(order?.status || "");
  const isCancelled = orderStatus === "cancelled";
  const isPending = orderStatus === "pending_receipt";
  const isOriginRoute =
    String(order?.originBranchId) === String(branch?.id);
  const isDestinationRoute =
    String(order?.destinationBranchId) === String(branch?.id);

  return (
    <AppModal
      isOpen={!!order}
      type="info"
      size="large"
      title={`Detalle del traspaso ${String(
        order?.folio || order?.id || ""
      ).toUpperCase()}`}
      showCancel
      cancelText="Cerrar"
      confirmText="Cerrar"
      onCancel={onClose}
      onClose={onClose}
      onConfirm={onClose}
    >
      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderGrid}>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Origen</span>
            <span className={styles.detailValue}>
              {order?.originBranchName || "—"}
            </span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Destino</span>
            <span className={styles.detailValue}>
              {order?.destinationBranchName || "—"}
            </span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Estado</span>
            <span
              className={`${styles.statusBadge} ${
                styles[`status${statusMeta.tone}`]
              }`}
            >
              {statusMeta.label}
            </span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Creado por</span>
            <span className={styles.detailValue}>
              {order?.createdByUsername ||
                order?.createdByEmail ||
                "SISTEMA"}
            </span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Fecha de creación</span>
            <span className={styles.detailValue}>
              {formatTransferDateTime(order?.createdAt)}
            </span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailLabel}>Fecha de recepción</span>
            <span className={styles.detailValue}>
              {formatTransferDateTime(order?.receivedAt)}
            </span>
          </div>
        </div>

        {order?.notes ? (
          <div className={styles.detailNotes}>
            <span className={styles.detailLabel}>Notas</span>
            <p className={styles.detailNotesText}>{order.notes}</p>
          </div>
        ) : null}
      </div>

      <div className={styles.detailTableWrapper}>
        <table className={styles.detailTable}>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Código / Barras</th>
              <th className={styles.alignRight}>Solicitado</th>
              <th className={styles.alignRight}>Recibido</th>
              <th className={styles.alignRight}>Devuelto</th>
              <th className={styles.alignRight}>Diferencia</th>
              <th className={styles.alignRight}>Inventario anterior</th>
              <th className={styles.alignRight}>Inventario actual</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const requestedQty = Number(item?.requestedQty ?? 0) || 0;
              const receivedQty = Number(item?.receivedQty ?? 0) || 0;
              const returnedQty = Number(item?.returnedQty ?? 0) || 0;
              const difference =
                requestedQty - receivedQty - returnedQty;

              const productId = String(item?.productId || item?.id || "");
              const inventoryRow =
                inventoryByProductId.get(productId) || {};
              const currentStock =
                Number(inventoryRow?.currentStock ?? 0) || 0;

              let previousStock = currentStock;
              if (isCancelled) {
                previousStock = currentStock;
              } else if (isOriginRoute) {
                if (isPending) {
                  previousStock = currentStock + requestedQty;
                } else {
                  previousStock =
                    currentStock +
                    (receivedQty + returnedQty > 0
                      ? receivedQty + returnedQty
                      : requestedQty);
                }
              } else if (isDestinationRoute) {
                if (isPending) {
                  previousStock = currentStock;
                } else {
                  previousStock =
                    currentStock -
                    (receivedQty > 0 ? receivedQty : requestedQty);
                }
              }

              if (previousStock < 0) previousStock = 0;

              return (
                <tr key={item?.id || item?.productId || index}>
                  <td>
                    <div className={styles.productCell}>
                      <strong>
                        {item?.name ||
                          item?.productName ||
                          item?.product?.name ||
                          item?.products?.name ||
                          "PRODUCTO SIN NOMBRE"}
                      </strong>
                      {item?.productId ? (
                        <span className={styles.detailMutedText}>
                          ID: {String(item.productId).slice(0, 8)}…
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    {item?.barcode && item.barcode !== "—"
                      ? item.barcode
                      : "—"}
                  </td>
                  <td className={styles.alignRight}>{requestedQty}</td>
                  <td className={styles.alignRight}>{receivedQty}</td>
                  <td className={styles.alignRight}>{returnedQty}</td>
                  <td
                    className={`${styles.alignRight} ${
                      difference === 0
                        ? styles.detailMutedText
                        : difference > 0
                          ? styles.detailWarningText
                          : styles.detailErrorText
                    }`}
                  >
                    {difference > 0 ? `-${difference}` : difference}
                  </td>
                  <td className={styles.alignRight}>
                    {isOriginRoute || isDestinationRoute
                      ? previousStock
                      : "—"}
                  </td>
                  <td className={styles.alignRight}>{currentStock}</td>
                </tr>
              );
            })}

            {items.length === 0 ? (
              <tr>
                <td colSpan="8" className={styles.emptyRow}>
                  Este traspaso no tiene productos registrados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppModal>
  );
};

export default TransferDetailModal;
