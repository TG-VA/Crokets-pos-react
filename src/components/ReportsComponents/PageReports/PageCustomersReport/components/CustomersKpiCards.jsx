/**
 * CustomersKpiCards.jsx
 * Tarjetas de métricas principales del reporte de clientes (estilo corporativo unificado).
 */

import React from "react";
import styles from "./CustomersComponents.module.css";
import { formatCurrency, formatNumber } from "../utils/customersReportFormatters";

import userIcon from "../../../../../assets/icons/user-solid.svg";
import dollarIcon from "../../../../../assets/icons/dollar-sign-solid-full.svg";
import basketIcon from "../../../../../assets/icons/basket-shopping-solid-full.svg";
import receiptIcon from "../../../../../assets/icons/receipt-solid-full.svg";
import coinsIcon from "../../../../../assets/icons/coins-solid-full.svg";
import giftsIcon from "../../../../../assets/icons/gifts-solid-full.svg";

const CustomersKpiCards = ({ kpis = {} }) => {
  const cards = [
    {
      id: "active_customers",
      label: "Clientes con Compras",
      value: formatNumber(kpis.activeCustomersCount || 0),
      subtitle: "Con al menos 1 compra histórica",
      icon: userIcon,
    },
    {
      id: "total_revenue",
      label: "Total Facturado",
      value: formatCurrency(kpis.totalSpentSum || 0),
      subtitle: "Ventas históricas acumuladas",
      icon: dollarIcon,
    },
    {
      id: "average_ticket",
      label: "Ticket Promedio",
      value: formatCurrency(kpis.averageTicket || 0),
      subtitle: "Gasto promedio por compra",
      icon: basketIcon,
    },
    {
      id: "average_frequency",
      label: "Frecuencia Media",
      value: `${(kpis.averageFrequency || 0).toFixed(1)} compras`,
      subtitle: "Promedio de visitas por cliente",
      icon: receiptIcon,
    },
    {
      id: "points_balance",
      label: "Saldo Total Puntos",
      value: `${formatNumber(kpis.totalPointsBalance || 0)} pts`,
      subtitle: `+${formatNumber(kpis.totalPointsEarned || 0)} acum. / -${formatNumber(kpis.totalPointsRedeemed || 0)} canj.`,
      icon: coinsIcon,
    },
    {
      id: "rewards_discount",
      label: "Ahorro en Recompensas",
      value: formatCurrency(kpis.totalRewardsDiscount || 0),
      subtitle: "Total bonificado en premios",
      icon: giftsIcon,
    },
  ];

  return (
    <div className={styles.kpiGrid}>
      {cards.map((card) => (
        <div key={card.id} className={styles.kpiCard}>
          <div className={styles.kpiHeaderRow}>
            <span className={styles.kpiLabel}>{card.label}</span>
            <div className={styles.kpiIconWrapper}>
              <img src={card.icon} alt="" style={{ width: 14, height: 14 }} />
            </div>
          </div>
          <span className={styles.kpiValue}>{card.value}</span>
          <span className={styles.kpiSubtitle}>{card.subtitle}</span>
        </div>
      ))}
    </div>
  );
};

export default CustomersKpiCards;
