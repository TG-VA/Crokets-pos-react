import styles from "../PointsHistory.module.css";

/**
 * Resumen global o por cliente segun exista una busqueda activa.
 */
const PointsHistorySummary = ({ summary, hasCustomerSearch }) => {
  return (
    <div className={styles.summaryGrid}>
      <div className={styles.summaryCard}>
        <span>
          {hasCustomerSearch ? "Movimientos del cliente" : "Movimientos"}
        </span>
        <strong>{summary.total}</strong>
      </div>

      <div className={styles.summaryCard}>
        <span>Puntos ganados</span>
        <strong>{summary.earned}</strong>
      </div>

      <div className={styles.summaryCard}>
        <span>Puntos descontados</span>
        <strong>{summary.redeemed}</strong>
      </div>

      <div className={styles.summaryCard}>
        <span>{hasCustomerSearch ? "Saldo del cliente" : "Saldo global"}</span>
        <strong>{summary.balance}</strong>
      </div>
    </div>
  );
};

export default PointsHistorySummary;
