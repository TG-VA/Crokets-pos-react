import React from "react";
import styles from "./CommissionsComponents.module.css";
import {
  formatCurrency,
  formatInteger,
} from "../utils/commissionsReportFormatters";

import coinsIcon from "../../../../../assets/icons/coins-solid-full.svg";
import dollarIcon from "../../../../../assets/icons/dollar-sign-solid-full.svg";
import boxIcon from "../../../../../assets/icons/box-solid-full.svg";
import userIcon from "../../../../../assets/icons/user-solid.svg";

export const CommissionsKpiCards = ({ kpis, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className={styles.kpiGrid}>
        {[1, 2, 3, 4].map((idx) => (
          <div key={idx} className={styles.kpiCard}>
            <div className={styles.kpiSkeletonRow} style={{ width: "40%" }} />
            <div
              className={`${styles.kpiSkeletonRow} ${styles.kpiSkeletonValue}`}
            />
            <div className={styles.kpiSkeletonRow} style={{ width: "70%" }} />
          </div>
        ))}
      </div>
    );
  }

  const {
    totalCommissions = 0,
    totalCommissionableSales = 0,
    totalCommissionablePieces = 0,
    topCashierName = "Sin datos",
    topCashierAmount = 0,
  } = kpis || {};

  const effectivePercent =
    totalCommissionableSales > 0
      ? ((totalCommissions / totalCommissionableSales) * 100).toFixed(1)
      : null;

  return (
    <div className={styles.kpiGrid}>
      <div className={styles.kpiCard}>
        <div className={styles.kpiHeaderRow}>
          <span className={styles.kpiLabel}>Total Comisiones</span>
          <div
            className={`${styles.kpiIconWrapper} ${styles.kpiIconWrapperHighlight}`}
          >
            <img src={coinsIcon} alt="Comisiones" className={styles.kpiIcon} />
          </div>
        </div>
        <span className={`${styles.kpiValue} ${styles.kpiValueHighlight}`}>
          {formatCurrency(totalCommissions)}
        </span>
        <span className={styles.kpiSubtext}>
          {effectivePercent !== null
            ? `${effectivePercent}% de la venta comisionable`
            : "Monto a dispersar a cajeros"}
        </span>
      </div>

      <div className={styles.kpiCard}>
        <div className={styles.kpiHeaderRow}>
          <span className={styles.kpiLabel}>Venta Comisionable</span>
          <div className={styles.kpiIconWrapper}>
            <img src={dollarIcon} alt="Venta" className={styles.kpiIcon} />
          </div>
        </div>
        <span className={styles.kpiValue}>
          {formatCurrency(totalCommissionableSales)}
        </span>
        <span className={styles.kpiSubtext}>
          Monto vendido en productos clave
        </span>
      </div>

      <div className={styles.kpiCard}>
        <div className={styles.kpiHeaderRow}>
          <span className={styles.kpiLabel}>Piezas Comisionables</span>
          <div className={styles.kpiIconWrapper}>
            <img src={boxIcon} alt="Piezas" className={styles.kpiIcon} />
          </div>
        </div>
        <span className={styles.kpiValue}>
          {formatInteger(totalCommissionablePieces)}
        </span>
        <span className={styles.kpiSubtext}>
          Unidades vendidas con incentivo
        </span>
      </div>

      <div className={styles.kpiCard}>
        <div className={styles.kpiHeaderRow}>
          <span className={styles.kpiLabel}>Cajero Top</span>
          <div className={styles.kpiIconWrapper}>
            <img src={userIcon} alt="Cajero Top" className={styles.kpiIcon} />
          </div>
        </div>
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
