import React, { useCallback } from "react";

import AppModal from "../../../../AppModal/AppModal";
import ExportIcon from "../../../../../assets/icons/file-export-solid-full.svg";
import { exportStoreOrderToExcel } from "../services/ordersExportExcelService";
import styles from "../PageOrders.module.css";

const handleExportExcel = async (order) => {
  if (!order) return;
  await exportStoreOrderToExcel(order);
};

const getStatusLabel = (status) => {
  if (status === "accepted_with_difference") return "Con diferencias";
  if (status === "accepted") return "Aceptado";
  return "Pendiente";
};

const getDifferences = (items = []) => {
  const differences = [];
  items.forEach((item) => {
    const differenceQty = Number(item.differenceQty);
    if (Number.isNaN(differenceQty) || differenceQty === 0) return;
    differences.push({
      productName: item.productName,
      differenceQty,
      type: differenceQty > 0 ? "sobrante" : "faltante",
    });
  });
  return differences;
};

const OrderDetailModal = ({ order, onClose }) => {
  const differences = getDifferences(order?.items);

  const exportHandler = useCallback(() => {
    handleExportExcel(order);
  }, [order]);

  return (
    <AppModal
      isOpen={Boolean(order)}
      onClose={onClose}
      title={order?.orderNumber || "Detalle de pedido"}
      cancelText="Cerrar"
      showCancel
      size="large"
    >
      {order ? (
        <div className={styles.detailContent}>
          <div className={styles.detailHeader}>
            <div>
              <div className={styles.detailTitle}>{order.orderName || ""}</div>
              <div className={styles.detailSubtitle}>
                {order.fromBranchName} / {order.toBranchName}
              </div>
            </div>
            <span
              className={`${styles.statusBadge} ${order.status === "accepted_with_difference" ? styles.statusWarning : styles.statusNeutral}`}
            >
              {getStatusLabel(order.status)}
            </span>
          </div>

          <div className={styles.detailGrid}>
            <div>
              <div className={styles.detailLabel}>Solicitado por</div>
              <div className={styles.detailValue}>
                {order.createdByLabel || ""}
              </div>
            </div>
            <div>
              <div className={styles.detailLabel}>Fecha de envío</div>
              <div className={styles.detailValue}>
                {order.sentAt
                  ? new Date(order.sentAt).toLocaleDateString()
                  : ""}
              </div>
            </div>
            <div>
              <div className={styles.detailLabel}>Fecha de recepción</div>
              <div className={styles.detailValue}>
                {order.receivedAt
                  ? new Date(order.receivedAt).toLocaleDateString()
                  : "-"}
              </div>
            </div>
            <div>
              <div className={styles.detailLabel}>Recibido por</div>
              <div className={styles.detailValue}>
                {order.receivedByLabel || "-"}
              </div>
            </div>
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Solicitado</th>
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
                  <td
                    className={
                      Number(item.differenceQty) !== 0
                        ? styles.differenceNegative
                        : ""
                    }
                  >
                    {item.differenceQty !== null &&
                    item.differenceQty !== undefined
                      ? item.differenceQty
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {differences.length > 0 ? (
            <div className={styles.differencesSection}>
              <div className={styles.differencesTitle}>Diferencias</div>
              <div className={styles.differencesList}>
                {differences.map((diff, index) => (
                  <div key={index} className={styles.differenceItem}>
                    <span>{diff.productName}</span>
                    <span>
                      {diff.type === "faltante" ? "Falta" : "Sobra"}{" "}
                      {Math.abs(diff.differenceQty)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {order.notes ? (
            <div className={styles.detailNotes}>
              <div className={styles.detailLabel}>Observaciones</div>
              <div className={styles.detailValue}>{order.notes}</div>
            </div>
          ) : null}

          {order.discrepancyNotes ? (
            <div className={styles.detailNotes}>
              <div className={styles.detailLabel}>Notas de diferencia</div>
              <div className={styles.detailValue}>{order.discrepancyNotes}</div>
            </div>
          ) : null}

          <div className={styles.detailActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={exportHandler}
            >
              <img src={ExportIcon} alt="" aria-hidden="true" />
              Exportar a Excel
            </button>
          </div>
        </div>
      ) : null}
    </AppModal>
  );
};

export default OrderDetailModal;
