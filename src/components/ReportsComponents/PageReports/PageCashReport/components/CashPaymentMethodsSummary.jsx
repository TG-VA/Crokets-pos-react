import React from "react";
import styles from "./CashComponents.module.css";
import { formatCurrency, formatNumber } from "../utils/cashReportFormatters";

import MoneyBillIcon from "../../../../../assets/icons/money-bill-wave-solid-full.svg";
import CreditCardIcon from "../../../../../assets/icons/credit-card-solid-full.svg";
import BuildingColumnsIcon from "../../../../../assets/icons/building-columns-solid-full.svg";
import DollarSignIcon from "../../../../../assets/icons/dollar-sign-solid-full.svg";

const CashPaymentMethodsSummary = ({ paymentMethods = [], loading = false }) => {
  const totalAmountAll = paymentMethods.reduce(
    (acc, curr) => acc + Number(curr.amount || 0),
    0
  );
  const totalTransactionsAll = paymentMethods.reduce(
    (acc, curr) => acc + Number(curr.count || 0),
    0
  );

  const getMethodIcon = (name, affectsCash) => {
    const lower = String(name || "").toLowerCase();
    if (affectsCash || lower.includes("efectivo")) return MoneyBillIcon;
    if (lower.includes("tarjeta") || lower.includes("débito") || lower.includes("crédito"))
      return CreditCardIcon;
    if (lower.includes("transferencia") || lower.includes("spei") || lower.includes("banco"))
      return BuildingColumnsIcon;
    return DollarSignIcon;
  };

  if (loading) {
    return (
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <div className={styles.tableCardTitleGroup}>
            <h2 className={styles.tableCardTitle}>Conciliación por Métodos de Pago</h2>
            <p className={styles.tableCardSubtitle}>Cargando resumen de métodos...</p>
          </div>
        </div>
        <div className={styles.tableResponsive}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Método de Pago</th>
                <th>Tipo de Flujo</th>
                <th>Transacciones</th>
                <th>Total Cobrado</th>
                <th>% Participación</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <td key={idx}>
                      <div className={styles.skeletonCell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <div className={styles.tableCardTitleGroup}>
            <h2 className={styles.tableCardTitle}>Conciliación por Métodos de Pago</h2>
            <p className={styles.tableCardSubtitle}>
              Distribución de ingresos por tipo de pago recibido.
            </p>
          </div>
        </div>
        <div className={styles.emptyState}>
          <img src={CreditCardIcon} alt="Sin pagos" className={styles.emptyStateIcon} />
          <h3 className={styles.emptyStateTitle}>Sin transacciones de venta registradas</h3>
          <p className={styles.emptyStateText}>
            No se han registrado pagos en el periodo y sucursal seleccionados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableCardHeader}>
        <div className={styles.tableCardTitleGroup}>
          <h2 className={styles.tableCardTitle}>Conciliación por Métodos de Pago</h2>
          <p className={styles.tableCardSubtitle}>
            Total facturado en el periodo: {formatCurrency(totalAmountAll)} ({formatNumber(totalTransactionsAll)} transacciones).
          </p>
        </div>
      </div>

      <div className={styles.tableResponsive}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Método de Pago</th>
              <th>Tipo de Flujo</th>
              <th>Transacciones</th>
              <th>Total Cobrado</th>
              <th>% Participación</th>
            </tr>
          </thead>
          <tbody>
            {paymentMethods.map((method) => {
              const amount = Number(method.amount || 0);
              const share = totalAmountAll > 0 ? (amount / totalAmountAll) * 100 : 0;
              const icon = getMethodIcon(method.methodName, method.affectsCash);

              return (
                <tr key={method.id} className={styles.dataTableRow}>
                  <td style={{ fontWeight: 600, color: "#1e293b" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <img src={icon} alt="" className={styles.badgeIcon} />
                      {method.methodName}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        method.affectsCash ? styles.badgeSuccess : styles.badgeInfo
                      }`}
                    >
                      {method.affectsCash ? "Efectivo en Caja" : "Dinero Electrónico / Bancario"}
                    </span>
                  </td>
                  <td>{formatNumber(method.count)}</td>
                  <td style={{ fontWeight: 700, color: "#0f172a" }}>
                    {formatCurrency(amount)}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "80px",
                          height: "8px",
                          backgroundColor: "#e2e8f0",
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(share, 100)}%`,
                            height: "100%",
                            backgroundColor: method.affectsCash ? "#16a34a" : "#0284c7",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>
                        {share.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={styles.tableFooterTotal}>
              <td style={{ fontWeight: 800, color: "#0f172a" }}>Total General</td>
              <td></td>
              <td style={{ fontWeight: 800, color: "#0f172a" }}>{formatNumber(totalTransactionsAll)}</td>
              <td style={{ fontWeight: 900, color: "#0284c7" }}>{formatCurrency(totalAmountAll)}</td>
              <td style={{ fontWeight: 800, color: "#475569" }}>100.0%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default CashPaymentMethodsSummary;
