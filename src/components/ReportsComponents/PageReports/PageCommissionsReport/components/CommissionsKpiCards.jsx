import React from "react";
import styles from "./CommissionsComponents.module.css";
import {
  formatCurrency,
  formatInteger,
} from "../utils/commissionsReportFormatters";

export const CommissionsKpiCards = ({ kpis }) => {
  const {
    totalCommissions = 0,
    totalCommissionableSales = 0,
    totalCommissionablePieces = 0,
    topCashierName = "Sin datos",
    topCashierAmount = 0,
  } = kpis || {};

  return (
    <div className={styles.kpiGrid}>
      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Total Comisiones</span>
        <span className={`${styles.kpiValue} ${styles.kpiValueHighlight}`}>
          {formatCurrency(totalCommissions)}
        </span>
        <span className={styles.kpiSubtext}>Monto a dispersar a cajeros</span>
      </div>

      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Venta Comisionable</span>
        <span className={styles.kpiValue}>
          {formatCurrency(totalCommissionableSales)}
        </span>
        <span className={styles.kpiSubtext}>Monto vendido en productos clave</span>
      </div>

      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Piezas Comisionables</span>
        <span className={styles.kpiValue}>
          {formatInteger(totalCommissionablePieces)}
        </span>
        <span className={styles.kpiSubtext}>Unidades vendidas con incentivo</span>
      </div>

      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Cajero Top</span>
        <span className={styles.kpiValue}>{topCashierName}</span>
        <span className={styles.kpiSubtext}>
          {topCashierAmount > 0
            ? `${formatCurrency(topCashierAmount)} generados`
            : "Sin comisiones registradas"}
        </span>
      </div>
    </div>
  );
};
