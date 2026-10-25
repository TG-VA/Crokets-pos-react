import AppModal from "../../../../AppModal/AppModal";
import styles from "../PageOrders.module.css";
import { getOrderStatusMeta } from "../utils/ordersFormatters";
import { getStatusToneClass } from "../utils/ordersStatusClasses";
import OrderPreviewSections from "./OrderPreviewSections";
import ExportIcon from "../../../../../assets/icons/file-export-solid-full.svg";

const OrderDetailModal = ({ order, onClose }) => {
  const status = getOrderStatusMeta(order?.status);

  const handleExportExcel = async () => {
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
      title={
        order
          ? `Pedido ${order.orderNumber} - ${order.orderName}`
          : "Detalle del pedido"
      }
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
                <span className={styles.routeBadgeOrange}>
                  Recibe {order.toBranchName}
                </span>
                <span className={styles.routeBadgeDark}>
                  desde {order.fromBranchName}
                </span>
              </p>
            </div>
            <span
              className={[
                styles.statusBadge,
                getStatusToneClass(styles, status.tone),
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {status.label}
            </span>
          </div>

          <OrderPreviewSections order={order} />

          <div className={styles.detailActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleExportExcel}
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
