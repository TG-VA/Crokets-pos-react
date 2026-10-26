import styles from "../PageOrders.module.css";

/**
 * Productos con diferencia de un pedido, con etiqueta: "Faltante: N" en rojo
 * y "Sobrante: N" en azul, solo los distintos de cero. `summary` nulo significa
 * que aun no hay recepcion y se muestra un guion; sin diferencias se muestra 0.
 */
const BADGES = [
  {
    key: "shortages",
    text: "Faltante",
    className: styles.differenceShort,
    label: "productos con faltante",
  },
  {
    key: "overages",
    text: "Sobrante",
    className: styles.differenceOver,
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
        className={[styles.differenceBadge, styles.differenceOk].join(" ")}
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
