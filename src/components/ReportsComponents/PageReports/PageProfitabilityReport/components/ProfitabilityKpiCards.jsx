/**
 * ProfitabilityKpiCards.jsx
 * Tarjetas de métricas ejecutivas para el Reporte de Rentabilidad.
 */

import React from "react";
import styles from "./ProfitabilityComponents.module.css";
import {
  formatCurrency,
  formatPercent,
  formatNumber,
} from "../utils/profitabilityReportFormatters";

import dollarIcon from "../../../../../assets/icons/dollar-sign-solid-full.svg";
import boxesIcon from "../../../../../assets/icons/boxes-stacked-solid-full.svg";
import coinsIcon from "../../../../../assets/icons/coins-solid-full.svg";
import percentIcon from "../../../../../assets/icons/percent-solid-full.svg";
import warningIcon from "../../../../../assets/icons/triangle-exclamation-solid-full.svg";

const ProfitabilityKpiCards = ({ kpis = {} }) => {
  const cards = [
    {
      id: "revenue",
      title: "Venta Neta (Ingresos)",
      value: formatCurrency(kpis.totalRevenue || 0),
      subtitle: `${formatNumber(kpis.totalSalesCount || 0)} tickets cobrados`,
      icon: dollarIcon,
      valueClass: "",
    },
    {
      id: "cost",
      title: "Costo de Ventas (COGS)",
      value: formatCurrency(kpis.totalCost || 0),
      subtitle: `${formatNumber(kpis.totalUnitsSold || 0)} unidades vendidas`,
      icon: boxesIcon,
      valueClass: "",
    },
    {
      id: "profit",
      title: "Utilidad Bruta ($)",
      value: formatCurrency(kpis.grossProfit || 0),
      subtitle: "Ingresos netos menos costo de producto",
      icon: coinsIcon,
      valueClass:
        (kpis.grossProfit || 0) > 0
          ? styles.kpiValueSuccess
          : (kpis.grossProfit || 0) < 0
          ? styles.kpiValueDanger
          : "",
    },
    {
      id: "margin",
      title: "Margen Bruto Global",
      value: formatPercent(kpis.grossMarginPercent || 0),
      subtitle: `Markup sobre costo: ${formatPercent(kpis.markupPercent || 0)}`,
      icon: percentIcon,
      valueClass:
        (kpis.grossMarginPercent || 0) >= 30
          ? styles.kpiValueSuccess
          : (kpis.grossMarginPercent || 0) < 15
          ? styles.kpiValueWarning
          : "",
    },
    {
      id: "critical",
      title: "Margen Crítico / Alerta",
      value: `${formatNumber(kpis.criticalProductsCount || 0)} art.`,
      subtitle:
        (kpis.lossProductsCount || 0) > 0
          ? `${kpis.lossProductsCount} con pérdida directa (<= 0%)`
          : "Artículos con margen menor a 15%",
      icon: warningIcon,
      valueClass:
        (kpis.criticalProductsCount || 0) > 0
          ? styles.kpiValueDanger
          : styles.kpiValueSuccess,
    },
  ];

  return (
    <div className={styles.kpiGrid}>
      {cards.map((c) => (
        <div key={c.id} className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>{c.title}</span>
            <div className={styles.kpiIconWrapper}>
              <img src={c.icon} alt="" className={styles.kpiIconImg} />
            </div>
          </div>
          <div className={`${styles.kpiValue} ${c.valueClass}`.trim()}>
            {c.value}
          </div>
          <p className={styles.kpiSubtitle}>{c.subtitle}</p>
        </div>
      ))}
    </div>
  );
};

export default ProfitabilityKpiCards;
