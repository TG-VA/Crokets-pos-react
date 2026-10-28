import styles from "../PageOrders.module.css";
import { ITEM_STATUS_DIFFERENCE_CLASS } from "../utils/differenceToneClasses";
import { ORDER_ITEM_STATUS_META } from "../utils/ordersFormatters";

/**
 * Productos con diferencia de un pedido, con etiqueta: "Faltante: N" en rojo
 * y "Sobrante: N" en azul, solo los distintos de cero. `summary` nulo significa
 * que aun no hay recepcion y se muestra un guion; sin diferencias se muestra 0.
 */
const BADGES = [
  {
    key: "shortages",
    text: ORDER_ITEM_STATUS_META.shortage.label,
    className: ITEM_STATUS_DIFFERENCE_CLASS.shortage,
    label: "productos con faltante",
  },
  {
    key: "overages",
    text: ORDER_ITEM_STATUS_META.overage.label,
    className: ITEM_STATUS_DIFFERENCE_CLASS.overage,
    label: "productos con sobrante",
  },
];

const DifferenceCountBadge = ({ summary }) => {
  if (!summary) {
    return <span className={styles.rowSubtext}>—</span>;
  }

  const visible = BADGES.filter((badge) => summary[badge.key] > 0);

  if (visible.length === 0) {
    return (
      <span
        className={[
          styles.differenceBadge,
          ITEM_STATUS_DIFFERENCE_CLASS.accepted,
        ].join(" ")}
        aria-label="Sin diferencias"
      >
        0
      </span>
    );
  }

  return (
    <span className={styles.differenceGroup}>
      {visible.map((badge) => (
        <span
          key={badge.key}
          className={[styles.differenceBadge, badge.className].join(" ")}
          aria-label={`${summary[badge.key]} ${badge.label}`}
        >
          {badge.text}: {summary[badge.key]}
        </span>
      ))}
    </span>
  );
};

export default DifferenceCountBadge;
