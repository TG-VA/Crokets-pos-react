/**
 * ProfitabilityCriticalRow.jsx
 * Fila individual para la tabla de productos con margen crítico o venta bajo costo.
 */

import React from "react";
import styles from "./ProfitabilityComponents.module.css";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "../utils/profitabilityReportFormatters";

const ProfitabilityCriticalRow = ({ product, onSelectKit }) => {
  const p = product;
  const mClass = p.marginClassification || {};

  return (
    <tr>
      <td className={styles.monospaceCell}>{p.barcode || "S/C"}</td>
      <td>
        <div className={styles.productCell}>
          <span className={styles.productNameText}>{p.productName}</span>
          {p.isPureReward ? (
            <span className={styles.rewardAlertText}>
              Bonificación en promoción / regalo (costo absorbido por el negocio)
            </span>
          ) : p.hasPartialReward ? (
            <span className={styles.rewardSubtext}>
              Incluye {p.redeemedUnits}{" "}
              {p.redeemedUnits === 1
                ? "unidad en promoción / regalo"
                : "unidades en promoción / regalo"}{" "}
              ($0.00)
            </span>
          ) : p.isKit ? (
            <button
              type="button"
              className={styles.kitMetaBadgeButton}
              onClick={() => onSelectKit && onSelectKit(p)}
              title="Clic para ver desglose de componentes y costos de este kit"
            >
              Kit ({p.kitComponentsCount || 0} prod.) · Costo por componentes
            </button>
          ) : p.isLoss ? (
            <span className={styles.productLossAlert}>
              Alerta: Se está vendiendo por debajo del costo
            </span>
          ) : null}
        </div>
      </td>
      <td>
        <span className={styles.badgeDepartment}>
          {p.departmentName || "General"}
        </span>
      </td>
      <td className={styles.alignCenter}>
        <span className={styles.boldValue}>{formatNumber(p.totalUnits)}</span>
      </td>
      <td className={styles.alignRight}>
        {formatCurrency(p.averageSalePrice)}
      </td>
      <td className={styles.alignRight}>
        {formatCurrency(p.averageCostPrice)}
      </td>
      <td className={styles.alignRight}>
        <span className={styles.boldValue}>
          {formatCurrency(p.totalRevenue)}
        </span>
      </td>
      <td className={styles.alignRight}>{formatCurrency(p.totalCost)}</td>
      <td className={styles.alignRight}>
        <span
          className={p.grossProfit < 0 ? styles.lossValue : styles.boldValue}
          title={
            p.isPureReward
              ? "Costo 100% absorbido por promoción comercial o regalo ($0.00 ingreso)"
              : p.hasPartialReward
              ? `Incluye ${p.redeemedUnits} ${
                  p.redeemedUnits === 1
                    ? "unidad entregada en promoción / regalo"
                    : "unidades entregadas en promoción / regalo"
                } ($0.00 ingreso)`
              : ""
          }
        >
          {formatCurrency(p.grossProfit)}
        </span>
      </td>
      <td className={styles.alignCenter}>
        <div className={styles.marginCellWrapper}>
          <span
            className={`${styles.marginBadge} ${
              styles[mClass.statusClass] || ""
            }`.trim()}
            title={
              p.isPureReward
                ? "100% bonificado en promoción o cortesía comercial ($0.00 ingreso)"
                : p.hasPartialReward
                ? `Margen contable afectado por ${p.redeemedUnits} ${
                    p.redeemedUnits === 1
                      ? "unidad entregada en promoción / regalo"
                      : "unidades entregadas en promoción / regalo"
                  }.`
                : mClass.label
            }
          >
            {mClass.badgeText || formatPercent(p.grossMarginPercent)}
          </span>
          {p.isPureReward ? (
            <span className={`${styles.diagnosisTag} ${styles.diagnosisPromo}`}>
              Regalo 100%
            </span>
          ) : p.hasPartialReward ? (
            <span className={`${styles.diagnosisTag} ${styles.diagnosisPromo}`}>
              Con Promo
            </span>
          ) : p.isLoss ? (
            <span className={`${styles.diagnosisTag} ${styles.diagnosisLoss}`}>
              Bajo Costo
            </span>
          ) : (
            <span
              className={`${styles.diagnosisTag} ${styles.diagnosisCritical}`}
            >
              Margen Bajo
            </span>
          )}
        </div>
      </td>
    </tr>
  );
};

export default ProfitabilityCriticalRow;
