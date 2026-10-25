import styles from "../PageOrders.module.css";
import {
  formatOrderDateTime,
  getOrderStatusMeta,
} from "../utils/ordersFormatters";
import { getStatusToneClass } from "../utils/ordersStatusClasses";
import EyeIcon from "../../../../../assets/icons/eye-solid-full.svg";
import ImportIcon from "../../../../../assets/icons/file-import-solid-full.svg";
import StoreIcon from "../../../../../assets/icons/store-solid-full.svg";
import CalendarIcon from "../../../../../assets/icons/calendar-days-solid-full.svg";
import BoxIcon from "../../../../../assets/icons/boxes-stacked-solid-full.svg";

const PendingOrderCard = ({ order, onOpenDetail, onSelectOrder }) => {
  const status = getOrderStatusMeta(order.status);
  const metaItems = [
    { icon: StoreIcon, label: "Origen", value: order.fromBranchName },
    {
      icon: CalendarIcon,
      label: "Enviado",
      value: formatOrderDateTime(order.sentAt),
    },
    {
      icon: BoxIcon,
      label: "Productos",
      value: String(order.items.length),
    },
  ];

  return (
    <article className={styles.orderCard}>
      <div className={styles.orderCardHeader}>
        <div>
          <span className={styles.orderFolio}>{order.orderNumber}</span>
          <h3 className={styles.orderCardTitle}>{order.orderName}</h3>
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

      <dl className={styles.orderMeta}>
        {metaItems.map((meta) => (
          <div key={meta.label} className={styles.orderMetaItem}>
            <img src={meta.icon} alt="" aria-hidden="true" />
            <dt>{meta.label}</dt>
            <dd>{meta.value}</dd>
          </div>
        ))}
      </dl>

      <ul className={styles.departmentChips}>
        {order.departments.length > 0 ? (
          order.departments.map((department) => (
            <li key={department} className={styles.departmentChip}>
              {department}
            </li>
          ))
        ) : (
          <li className={styles.departmentChip}>Sin departamento</li>
        )}
      </ul>

      <div className={styles.orderCardActions}>
        <button
          type="button"
          className={styles.detailButton}
          onClick={() => onOpenDetail(order)}
        >
          <img src={EyeIcon} alt="" aria-hidden="true" />
          Ver detalle
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => onSelectOrder(order)}
        >
          <img src={ImportIcon} alt="" aria-hidden="true" />
          Recibir pedido
        </button>
      </div>
    </article>
  );
};

export default PendingOrderCard;
