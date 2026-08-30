import React from "react";
import styles from "../CashComponents.module.css";
import { formatCurrency } from "../../utils/cashReportFormatters";

const DetailCashBalanceSection = ({ sessionDetail, isClosed }) => {
  return (
    <div className={styles.modalSection}>
      <h3 className={styles.modalSectionTitle}>Arqueo y Flujo de Efectivo</h3>
      <div className={styles.detailGrid}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Fondo Inicial</span>
          <span className={styles.detailValue}>
            {formatCurrency(sessionDetail.opening_amount)}
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Ventas Efectivo</span>
          <span className={`${styles.detailValue} ${styles.textSuccess}`}>
            +{formatCurrency(sessionDetail.cashSalesTotal)}
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Ingresos Manuales</span>
          <span className={`${styles.detailValue} ${styles.textPrimary}`}>
            +{formatCurrency(sessionDetail.totalManualIn)}
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Salidas / Retiros</span>
          <span className={`${styles.detailValue} ${styles.textDanger}`}>
            -{formatCurrency(sessionDetail.totalManualOut)}
          </span>
        </div>

        <div className={`${styles.detailItem} ${styles.detailItemMuted}`}>
          <span className={styles.detailLabel}>Efectivo Esperado</span>
          <span className={styles.detailValue}>
            {formatCurrency(sessionDetail.expectedCashCalculated)}
          </span>
        </div>

        <div className={`${styles.detailItem} ${styles.detailItemMuted}`}>
          <span className={styles.detailLabel}>Efectivo Contado</span>
          <span className={styles.detailValue}>
            {isClosed ? formatCurrency(sessionDetail.closing_amount) : "Pendiente"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DetailCashBalanceSection;
