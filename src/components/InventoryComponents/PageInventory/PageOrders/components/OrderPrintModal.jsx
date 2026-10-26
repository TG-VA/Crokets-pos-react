import AppModal from "../../../../AppModal/AppModal";
import styles from "../PageOrders.module.css";
import { getOrderStatusMeta } from "../utils/ordersFormatters";
import { getStatusToneClass } from "../utils/ordersStatusClasses";
import BranchBadge from "./BranchBadge";
import OrderPreviewSections from "./OrderPreviewSections";

const OrderPrintModal = ({ order, onClose, onExportExcel }) => {
  const status = getOrderStatusMeta(order?.status);

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
              <p className={styles.detailRoute}>
                <BranchBadge role="origin" name={order.fromBranchName} />
                <span className={styles.routeConnector}>hacia</span>
                <BranchBadge role="destination" name={order.toBranchName} />
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
        </div>
      ) : null}
    </AppModal>
  );
};

export default OrderPrintModal;
