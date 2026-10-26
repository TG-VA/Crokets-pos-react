import styles from "../PageOrders.module.css";

/**
 * Numero de productos con diferencia de un pedido. `count` nulo significa que
 * aun no hay recepcion y se muestra un guion.
 */
const DifferenceCountBadge = ({ count }) => {
  if (count === null || count === undefined) {
    return <span className={styles.rowSubtext}>—</span>;
  }

  const toneClass = count > 0 ? styles.statusWarning : styles.differenceOk;

  return (
    <span
      className={[styles.differenceBadge, toneClass].filter(Boolean).join(" ")}
      aria-label={`${count} productos con diferencia`}
    >
      {count}
    </span>
  );
};

export default DifferenceCountBadge;
