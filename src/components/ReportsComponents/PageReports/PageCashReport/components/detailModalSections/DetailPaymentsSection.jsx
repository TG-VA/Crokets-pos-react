import React from "react";
import styles from "../CashComponents.module.css";
import { formatCurrency } from "../../utils/cashReportFormatters";

const DetailPaymentsSection = ({ paymentsByMethod = [] }) => {
  if (!paymentsByMethod || paymentsByMethod.length === 0) return null;

  const totalTransactions = paymentsByMethod.reduce((acc, p) => acc + (p.count || 0), 0);
  const totalAmount = paymentsByMethod.reduce((acc, p) => acc + (p.total || 0), 0);

  return (
    <div className={styles.modalSection}>
      <h3 className={styles.modalSectionTitle}>Ventas por Forma de Pago</h3>
      <div className={styles.tableResponsive}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Método de Pago</th>
              <th>Tipo</th>
              <th>Transacciones</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {paymentsByMethod.map((pm, idx) => (
              <tr key={idx}>
                <td className={styles.cellSemiBold}>{pm.name}</td>
                <td>
                  <span
                    className={`${styles.badge} ${
                      pm.affectsCash ? styles.badgeSuccess : styles.badgeInfo
                    }`.trim()}
                  >
                    {pm.affectsCash ? "Efectivo" : "Electrónico"}
                  </span>
                </td>
                <td>{pm.count}</td>
                <td className={styles.cellBold}>{formatCurrency(pm.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={styles.tableFooterTotal}>
              <td className={styles.cellExtraBold}>Total</td>
              <td></td>
              <td className={styles.cellExtraBold}>{totalTransactions}</td>
              <td className={`${styles.cellBold} ${styles.textPrimary}`}>
                {formatCurrency(totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default DetailPaymentsSection;
