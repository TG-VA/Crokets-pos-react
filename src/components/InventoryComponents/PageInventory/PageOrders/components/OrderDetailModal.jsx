import AppModal from "../../../../AppModal/AppModal";
import styles from "../PageOrders.module.css";
import { getOrderStatusMeta } from "../utils/ordersFormatters";
import { getStatusToneClass } from "../utils/ordersStatusClasses";
import BranchBadge from "./BranchBadge";
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
      footerActions={
        order ? (
          <button
            type="button"
            className={styles.exportButton}
            onClick={handleExportExcel}
          >
            <img src={ExportIcon} alt="" aria-hidden="true" />
            Exportar a Excel
          </button>
        ) : null
      }
    >
      {order ? (
        <div className={styles.detailContent}>
          <div className={styles.detailHeader}>
            <h3 className={styles.detailTitle}>{order.orderName}</h3>
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

          <div className={styles.detailRoute}>
            <BranchBadge role="origin" name={order.fromBranchName} />
            <span className={styles.routeConnector}>hacia</span>
            <BranchBadge role="destination" name={order.toBranchName} />
          </div>

          <OrderPreviewSections order={order} paginated />
        </div>
      ) : null}
    </AppModal>
  );
};

export default OrderDetailModal;
