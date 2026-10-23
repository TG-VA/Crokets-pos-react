import React from "react";

import AppModal from "../../../../AppModal/AppModal";
import styles from "../PageOrders.module.css";
import {
  formatOrderDateTime,
  formatQuantity,
  getOrderStatusMeta,
} from "../utils/ordersFormatters";
import PrintIcon from "../../../../../assets/icons/print-solid-full.svg";

const OrderPrintModal = ({ order, onClose, onConfirm }) => {
  const status = getOrderStatusMeta(order?.status);

  return (
    <AppModal
      isOpen={Boolean(order)}
      title="Vista de impresion"
      message="Revisa el contenido antes de imprimir o guardar como PDF."
      confirmText="Imprimir / Guardar PDF"
      cancelText="Cerrar"
      showCancel
      onConfirm={onConfirm}
      onCancel={onClose}
      onClose={onClose}
      size="large"
    >
      {order ? (
        <div className={styles.printPreview}>
          <div className={styles.printHeader}>
            <div>
              <span className={styles.eyebrow}>Pedido de abastecimiento</span>
              <h3 className={styles.detailTitle}>
                {order.orderNumber} - {order.orderName}
              </h3>
            </div>
            <span className={styles.printStatus}>{status.label}</span>
          </div>

          <dl className={styles.detailMeta}>
            <div>
              <dt>Origen</dt>
              <dd>{order.fromBranchName}</dd>
            </div>
            <div>
              <dt>Destino</dt>
              <dd>{order.toBranchName}</dd>
            </div>
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
              <dt>Departamentos</dt>
              <dd>{order.departments.join(", ") || "Sin departamento"}</dd>
            </div>
            <div>
              <dt>Productos</dt>
              <dd>{order.items.length}</dd>
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
              <strong>Notas</strong>
              <p>{order.notes}</p>
            </div>
          ) : null}

          {order.discrepancyNotes ? (
            <div className={`${styles.detailNote} ${styles.detailWarning}`}>
              <strong>Diferencias</strong>
              <p>{order.discrepancyNotes}</p>
            </div>
          ) : null}

          <div className={styles.printHint}>
            <img src={PrintIcon} alt="" aria-hidden="true" />
            <span>
              Se abrira una ventana de impresion del sistema para guardar como
              PDF o imprimir.
            </span>
          </div>
        </div>
      ) : null}
    </AppModal>
  );
};

export default OrderPrintModal;
