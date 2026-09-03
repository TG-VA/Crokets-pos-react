import React from "react";
import styles from "./InventoryComponents.module.css";
import { formatCurrency } from "../../../../../utils/formatters";

const InventoryKpiCards = ({ kpis = {}, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className={styles.kpiGrid}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Cargando métricas...</span>
            <span className={styles.kpiValue}>---</span>
          </div>
        ))}
      </div>
    );
  }

  const {
    totalCostValuation = 0,
    totalSaleValuation = 0,
    profitMargin = 0,
    totalUnits = 0,
    totalSkus = 0,
    exhaustedCount = 0,
    lowStockCount = 0,
  } = kpis;

  return (
    <div className={styles.kpiGrid}>
      {/* 1. Valor al Costo */}
      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Valor al Costo</span>
        <span className={styles.kpiValue} title={formatCurrency(totalCostValuation)}>
          {formatCurrency(totalCostValuation)}
        </span>
        <span className={styles.kpiSubtext}>Inversión total en existencia</span>
      </div>

      {/* 2. Valor a la Venta */}
      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Valor Estimado de Venta</span>
        <span className={styles.kpiValue} title={formatCurrency(totalSaleValuation)}>
          {formatCurrency(totalSaleValuation)}
        </span>
        <span className={styles.kpiSubtext}>
          Margen proyectado: {profitMargin.toFixed(1)}%
        </span>
      </div>

      {/* 3. Volumen de Inventario */}
      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Volumen de Inventario</span>
        <span className={styles.kpiValue}>
          {totalUnits.toLocaleString()} <span className={styles.kpiUnitLabel}>piezas</span>
        </span>
        <span className={styles.kpiSubtext}>
          {totalSkus.toLocaleString()} productos controlados
        </span>
      </div>

      {/* 4. Alertas de Stock */}
      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Alertas de Inventario</span>
        <div className={styles.kpiAlertContainer}>
          <span className={`${styles.kpiAlertBadge} ${styles.badgeExhausted}`}>
            {exhaustedCount} Agotados
          </span>
          <span className={`${styles.kpiAlertBadge} ${styles.badgeLow}`}>
            {lowStockCount} Stock Bajo
          </span>
        </div>
        <span className={styles.kpiSubtext}>Requieren atención de compras</span>
      </div>
    </div>
  );
};

export default InventoryKpiCards;
