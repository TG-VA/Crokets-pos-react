import React from "react";
import styles from "./CashComponents.module.css";
import { formatCurrency, getDifferenceStatus } from "../utils/cashReportFormatters";

const CashKpiCards = ({ kpis = {}, loading = false }) => {
  const diffStatus = getDifferenceStatus(kpis.totalDifference);
  const isNegativeDiff = kpis.totalDifference < -0.01;

  if (loading) {
    return (
      <div className={styles.kpiGrid}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className={styles.kpiCard}>
            <div className={`${styles.skeletonCell} ${styles.kpiSkeleton1}`} />
            <div className={`${styles.skeletonCell} ${styles.kpiSkeleton2}`} />
            <div className={`${styles.skeletonCell} ${styles.kpiSkeleton3}`} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.kpiGrid}>
      {/* 1. Fondo Inicial Total */}
      <div className={`${styles.kpiCard} ${styles.kpiCardSlate}`}>
        <span className={styles.kpiLabel}>Fondo Inicial Total</span>
        <strong className={styles.kpiValue}>
          {formatCurrency(kpis.totalOpening)}
        </strong>
        <span className={styles.kpiSubtitle}>Monto de aperturas de caja</span>
      </div>

      {/* 2. Ventas en Efectivo */}
      <div className={`${styles.kpiCard} ${styles.kpiCardPrimary}`}>
        <span className={styles.kpiLabel}>Ventas en Efectivo</span>
        <strong className={styles.kpiValue}>
          {formatCurrency(kpis.totalCashSales)}
        </strong>
        <span className={styles.kpiSubtitle}>Ingresos directos por ventas</span>
      </div>

      {/* 3. Movimientos Manuales */}
      <div className={`${styles.kpiCard} ${styles.kpiCardPrimary}`}>
        <span className={styles.kpiLabel}>Movimientos Manuales</span>
        <strong className={styles.kpiValue}>
          {formatCurrency(kpis.totalManualInflow - kpis.totalManualOutflow)}
        </strong>
        <span className={styles.kpiSubtitle}>
          +{formatCurrency(kpis.totalManualInflow)} / -{formatCurrency(kpis.totalManualOutflow)}
        </span>
      </div>

      {/* 4. Efectivo Esperado */}
      <div className={`${styles.kpiCard} ${styles.kpiCardNavy}`}>
        <span className={styles.kpiLabel}>Efectivo Esperado</span>
        <strong className={styles.kpiValue}>
          {formatCurrency(kpis.totalExpectedCash)}
        </strong>
        <span className={styles.kpiSubtitle}>Fondo + Ventas + Movimientos</span>
      </div>

      {/* 5. Diferencia Neta (Alerta crítica) */}
      <div
        className={`${styles.kpiCard} ${
          isNegativeDiff ? styles.kpiCardDanger : styles.kpiCardSuccess
        }`.trim()}
      >
        <span className={styles.kpiLabel}>Diferencia Neta</span>
        <strong
          className={`${styles.kpiValue} ${
            isNegativeDiff ? styles.kpiValueDanger : styles.kpiValueSuccess
          }`.trim()}
        >
          {diffStatus.formatted}
        </strong>
        <span className={styles.kpiSubtitle}>
          {kpis.sessionsWithDiscrepancy === 0
            ? "Sin descuadres registrados"
            : `${kpis.sessionsWithDiscrepancy} turno(s) con diferencia`}
        </span>
      </div>

      {/* 6. Turnos de Caja */}
      <div className={`${styles.kpiCard} ${styles.kpiCardSlate}`}>
        <span className={styles.kpiLabel}>Turnos de Caja</span>
        <strong className={styles.kpiValue}>{kpis.totalSessions || 0}</strong>
        <span className={styles.kpiSubtitle}>
          {kpis.totalClosedSessions || 0} cerrados |{" "}
          {(kpis.totalSessions || 0) - (kpis.totalClosedSessions || 0)} abiertos
        </span>
      </div>
    </div>
  );
};

export default CashKpiCards;
