import React, { useCallback } from "react";

import AppModal from "../../../../AppModal/AppModal";
import { exportStoreOrderToExcel } from "../services/ordersExportExcelService";
import ExportIcon from "../../../../../assets/icons/file-export-solid-full.svg";
import styles from "../PageOrders.module.css";

const handleExportExcel = async (order) => {
  if (!order) return;
  await exportStoreOrderToExcel(order);
};

const OrderPrintModal = ({ order, onClose, onExportExcel }) => {
  const exportHandler = useCallback(async () => {
    if (typeof onExportExcel === "function") {
      await onExportExcel(order);
      return;
    }
    await handleExportExcel(order);
  }, [onExportExcel, order]);

  return (
    <AppModal
      isOpen={Boolean(order)}
      onClose={onClose}
      title="Vista de impresión"
      confirmText="Exportar a Excel"
      cancelText="Cerrar"
      showCancel
      onConfirm={exportHandler}
      onCancel={onClose}
      size="large"
    >
      {order ? (
        <div className={styles.printPreview}>
          <div className={styles.printHeader}>
            <div>
              <div className={styles.printModalTitle}>
                Pedido {order.orderNumber}
              </div>
              <div className={styles.printModalSubtitle}>
                {order.orderName || ""}
              </div>
            </div>
            <span className={`${styles.statusBadge} ${styles.statusBadgeBold}`}>
              {order.status === "accepted_with_difference"
                ? "Con diferencias"
                : order.status === "accepted"
                  ? "Aceptado"
                  : "Pendiente"}
            </span>
          </div>
          <div className={styles.printHeader}>
            <div>
              <div className={styles.printModalSubtitle}>Origen</div>
              <div className={styles.printModalTitle}>
                {order.fromBranchName || ""}
              </div>
            </div>
            <div>
              <div className={styles.printModalSubtitle}>Destino</div>
              <div className={styles.printModalTitle}>
                {order.toBranchName || ""}
              </div>
            </div>
          </div>
          <div className={styles.printHeader}>
            <div>
              <div className={styles.printModalSubtitle}>Solicitado por</div>
              <div className={styles.printModalTitle}>
                {order.createdByLabel || ""}
              </div>
            </div>
            <div>
              <div className={styles.printModalSubtitle}>Fecha de envío</div>
              <div className={styles.printModalTitle}>
                {order.sentAt
                  ? new Date(order.sentAt).toLocaleDateString()
                  : ""}
              </div>
            </div>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad solicitada</th>
                <th>Recibido</th>
                <th>Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, index) => (
                <tr key={item.id || index}>
                  <td>{item.productName}</td>
                  <td>{item.expectedQty ?? item.quantity}</td>
                  <td>{item.receivedQty ?? "-"}</td>
                  <td>
                    {item.differenceQty !== null &&
                    item.differenceQty !== undefined
                      ? item.differenceQty
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {order.notes ? (
            <div className={styles.printHint}>
              <span>Observaciones: {order.notes}</span>
            </div>
          ) : null}
          {order.discrepancyNotes ? (
            <div className={styles.printHint}>
              <span>Notas de diferencia: {order.discrepancyNotes}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </AppModal>
  );
};

export default OrderPrintModal;
