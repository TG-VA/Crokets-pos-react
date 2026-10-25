import AppModal from "../../../../AppModal/AppModal";
import styles from "../PageOrders.module.css";
import {
  formatOrderDateTime,
  formatQuantity,
  getOrderStatusMeta,
} from "../utils/ordersFormatters";
import { getOrderDifferences } from "../utils/ordersCalculationService";

const STATUS_CLASS = {
  pending: styles.statusPending,
  success: styles.statusSuccess,
  warning: styles.statusWarning,
  danger: styles.statusDanger,
  neutral: styles.statusPending,
};

const OrderPrintModal = ({ order, onClose, onExportExcel }) => {
  const status = getOrderStatusMeta(order?.status);
  const differences = getOrderDifferences(order?.items);

  const handleExportExcel = async () => {
    if (typeof onExportExcel === "function") {
      onExportExcel(order);
      return;
    }
    try {
      const { exportStoreOrderToExcel } =
        await import("../services/ordersExportExcelService");
      await exportStoreOrderToExcel(order);
    } catch (err) {
      console.error("Error al exportar pedido a Excel:", err);
    }
  };

  return (
    <AppModal
      isOpen={Boolean(order)}
      confirmText="Exportar a Excel"
      cancelText="Cerrar"
      showCancel
      onConfirm={handleExportExcel}
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
            <span
              className={[
                styles.statusBadge,
                styles.statusBadgeBold,
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
                {order.items?.map((item) => {
                  const hasDifference =
                    item?.differenceQty !== undefined &&
                    item?.differenceQty !== null &&
                    Number(item.differenceQty) !== 0;

                  return (
                    <tr
                      key={item.id || item.productId}
                      className={
                        hasDifference ? styles.rowWithDifference : undefined
                      }
                    >
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {order.notes ? (
            <div className={styles.detailNote}>
              <strong>Notas del pedido</strong>
              <p>{order.notes}</p>
            </div>
          ) : null}

          {differences.length > 0 ? (
            <div className={styles.differencesSection}>
              <strong>Diferencias</strong>
              <div className={styles.tableWrapper}>
                <table className={styles.differencesTable}>
                  <thead>
                    <tr>
                      <th>Codigo</th>
                      <th>Producto</th>
                      <th>Departamento</th>
                      <th className={styles.numeric}>Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {differences.map((item) => {
                      const diff = Number(item.differenceQty);
                      const isPositive = diff > 0;
                      const diffLabel = isPositive
                        ? `+${formatQuantity(diff)}`
                        : formatQuantity(diff);

                      return (
                        <tr key={item.id || item.productId}>
                          <td>{item.barcode || "—"}</td>
                          <td>{item.productName}</td>
                          <td>{item.departmentName || "Sin departamento"}</td>
                          <td className={styles.numeric}>
                            <span
                              className={
                                isPositive
                                  ? styles.differencePositive
                                  : styles.differenceNegative
                              }
                            >
                              {diffLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {order.discrepancyNotes ? (
            <div className={`${styles.detailNote} ${styles.detailWarning}`}>
              <strong>Diferencias de recepcion</strong>
              <p>{order.discrepancyNotes}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </AppModal>
  );
};

export default OrderPrintModal;
