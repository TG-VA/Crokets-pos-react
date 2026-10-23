import React from "react";

import AppModal from "../../../../AppModal/AppModal";
import styles from "../PageOrders.module.css";
import {
  formatOrderDateTime,
  formatQuantity,
  getOrderStatusMeta,
} from "../utils/ordersFormatters";
import PrintIcon from "../../../../../assets/icons/print-solid-full.svg";

const STATUS_CLASS = {
  pending: styles.statusPending,
  success: styles.statusSuccess,
  warning: styles.statusWarning,
  danger: styles.statusDanger,
  neutral: styles.statusPending,
};

const OrderDetailModal = ({ order, onClose, onPrint }) => {
  const status = getOrderStatusMeta(order?.status);

  return (
    <AppModal
      isOpen={Boolean(order)}
      title={order ? `Pedido ${order.orderNumber}` : "Detalle del pedido"}
      confirmText="Cerrar"
      onConfirm={onClose}
      onClose={onClose}
      size="large"
    >
      {order ? (
        <div className={styles.detailContent}>
          <div className={styles.detailHeader}>
            <div>
              <h3 className={styles.detailTitle}>{order.orderName}</h3>
              <p className={styles.detailRoute}>
                {order.fromBranchName} hacia {order.toBranchName}
              </p>
            </div>
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
          </div>

          <dl className={styles.detailMeta}>
            <div>
              <dt>Enviado</dt>
              <dd>{formatOrderDateTime(order.sentAt)}</dd>
            </div>
            <div>
              <dt>Recibido</dt>
              <dd>
                {order.acceptedAt
                  ? formatOrderDateTime(order.acceptedAt)
                  : "Pendiente"}
              </dd>
            </div>
            <div>
              <dt>Generado por</dt>
              <dd>{order.createdByLabel || "—"}</dd>
            </div>
            <div>
              <dt>Recibido por</dt>
              <dd>{order.receivedByLabel || "—"}</dd>
            </div>
            <div>
              <dt>Departamentos</dt>
              <dd>{order.departments.join(", ") || "Sin departamento"}</dd>
            </div>
              <div>
                <dt>Productos</dt>
                <dd>{order.items?.length || 0}</dd>
              </div>
          </dl>

          <div className={styles.tableWrapper}>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Producto</th>
                  <th>Departamento</th>
                  <th className={styles.numeric}>Esperado</th>
                  <th className={styles.numeric}>Recibido</th>
                  <th className={styles.numeric}>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id || item.productId}>
                    <td>{item.barcode || "—"}</td>
                    <td>{item.productName}</td>
                    <td>{item.departmentName || "Sin departamento"}</td>
                    <td className={styles.numeric}>
                      {formatQuantity(item.expectedQty)}
                    </td>
                    <td className={styles.numeric}>
                      {formatQuantity(item.receivedQty)}
                    </td>
                    <td className={styles.numeric}>
                      {formatQuantity(item.differenceQty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {order.notes ? (
            <div className={styles.detailNote}>
              <strong>Notas del pedido</strong>
              <p>{order.notes}</p>
            </div>
          ) : null}

          {order.discrepancyNotes ? (
            <div className={`${styles.detailNote} ${styles.detailWarning}`}>
              <strong>Diferencias de recepcion</strong>
              <p>{order.discrepancyNotes}</p>
            </div>
          ) : null}

          <div className={styles.detailActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onPrint(order)}
            >
              <img src={PrintIcon} alt="" aria-hidden="true" />
              Imprimir pedido
            </button>
          </div>
        </div>
      ) : null}
    </AppModal>
  );
};

export default OrderDetailModal;
