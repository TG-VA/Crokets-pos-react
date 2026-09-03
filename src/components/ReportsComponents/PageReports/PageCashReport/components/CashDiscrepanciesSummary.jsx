import React from "react";
import styles from "./CashComponents.module.css";
import { formatCurrency, formatNumber, getDifferenceStatus } from "../utils/cashReportFormatters";

import UserIcon from "../../../../../assets/icons/user-solid.svg";
import CircleCheckIcon from "../../../../../assets/icons/circle-check-solid-full.svg";
import TriangleAlertIcon from "../../../../../assets/icons/triangle-exclamation-solid-full.svg";

const CashDiscrepanciesSummary = ({ cashierAudit = [], loading = false }) => {
  if (loading) {
    return (
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <div className={styles.tableCardTitleGroup}>
            <h2 className={styles.tableCardTitle}>Auditoría de Discrepancias por Cajero</h2>
            <p className={styles.tableCardSubtitle}>Analizando registros de arqueo...</p>
          </div>
        </div>
        <div className={styles.tableResponsive}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Cajero / Usuario</th>
                <th>Turnos Cerrados</th>
                <th>Turnos Exactos</th>
                <th>Turnos c/ Faltante</th>
                <th>Turnos c/ Sobrante</th>
                <th>Diferencia Neta</th>
                <th>Exactitud</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, idx) => (
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

  if (cashierAudit.length === 0) {
    return (
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <div className={styles.tableCardTitleGroup}>
            <h2 className={styles.tableCardTitle}>Auditoría de Discrepancias por Cajero</h2>
            <p className={styles.tableCardSubtitle}>
              Identificación de descuadres y precisión de arqueo por usuario.
            </p>
          </div>
        </div>
        <div className={styles.emptyState}>
          <img src={UserIcon} alt="Sin datos" className={styles.emptyStateIcon} />
          <h3 className={styles.emptyStateTitle}>Sin registros de auditoría</h3>
          <p className={styles.emptyStateText}>
            No hay turnos cerrados para auditar en el periodo seleccionado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableCardHeader}>
        <div className={styles.tableCardTitleGroup}>
          <h2 className={styles.tableCardTitle}>Auditoría de Discrepancias por Cajero</h2>
          <p className={styles.tableCardSubtitle}>
            Comparativa de exactitud en cierres y acumulación de diferencias por empleado.
          </p>
        </div>
      </div>

      <div className={styles.tableResponsive}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Cajero / Usuario</th>
              <th>Turnos Cerrados</th>
              <th>Turnos Exactos</th>
              <th>Turnos c/ Faltante</th>
              <th>Turnos c/ Sobrante</th>
              <th>Diferencia Neta</th>
              <th>Exactitud</th>
            </tr>
          </thead>
          <tbody>
            {cashierAudit.map((c) => {
              const diffInfo = getDifferenceStatus(c.netDifference);
              const accuracy = c.accuracyRate || 0;

              return (
                <tr key={c.userId} className={styles.dataTableRow}>
                  <td className={styles.textSlateDark}>
                    <div className={styles.badgeProgressGroup}>
                      <img src={UserIcon} alt="" className={styles.badgeIcon} />
                      {String(c.username || "USUARIO").toUpperCase()}
                    </div>
                  </td>
                  <td>{formatNumber(c.closedSessions)}</td>
                  <td className={styles.textSuccess}>
                    {formatNumber(c.exactSessions)}
                  </td>
                  <td className={c.shortageCount > 0 ? styles.textDanger : styles.textMuted}>
                    {formatNumber(c.shortageCount)} {c.shortageCount > 0 && `(-${formatCurrency(c.totalShortage)})`}
                  </td>
                  <td className={c.surplusCount > 0 ? styles.textPrimary : styles.textMuted}>
                    {formatNumber(c.surplusCount)} {c.surplusCount > 0 && `(+${formatCurrency(c.totalSurplus)})`}
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        diffInfo.status === "exact"
                          ? styles.badgeSuccess
                          : diffInfo.status === "surplus"
                          ? styles.badgeInfo
                          : styles.badgeDanger
                      }`.trim()}
                    >
                      <img
                        src={
                          diffInfo.status === "shortage"
                            ? TriangleAlertIcon
                            : CircleCheckIcon
                        }
                        alt=""
                        className={styles.badgeIcon}
                      />
                      {diffInfo.formatted}
                    </span>
                  </td>
                  <td>
                    <div className={styles.badgeProgressGroup}>
                      <div className={styles.progressTrack}>
                        <div
                          className={`${styles.progressFill} ${
                            accuracy >= 90
                              ? styles.progressFillSuccess
                              : accuracy >= 70
                              ? styles.progressFillWarning
                              : styles.progressFillDanger
                          }`.trim()}
                          style={{ width: `${Math.min(accuracy, 100)}%` }}
                        />
                      </div>
                      <span className={styles.badgePercentText}>
                        {accuracy.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={styles.tableFooterTotal}>
              <td className={styles.cellExtraBold}>
                Totales ({cashierAudit.length} usuario{cashierAudit.length !== 1 ? "s" : ""})
              </td>
              <td>{formatNumber(cashierAudit.reduce((acc, c) => acc + (c.closedSessions || 0), 0))}</td>
              <td className={styles.textSuccess}>
                {formatNumber(cashierAudit.reduce((acc, c) => acc + (c.exactSessions || 0), 0))}
              </td>
              <td className={styles.textDanger}>
                {formatNumber(cashierAudit.reduce((acc, c) => acc + (c.shortageCount || 0), 0))}
              </td>
              <td className={styles.textPrimary}>
                {formatNumber(cashierAudit.reduce((acc, c) => acc + (c.surplusCount || 0), 0))}
              </td>
              <td>
                {(() => {
                  const net = cashierAudit.reduce((acc, c) => acc + (c.netDifference || 0), 0);
                  const info = getDifferenceStatus(net);
                  return (
                    <span
                      className={`${styles.badge} ${
                        info.status === "exact"
                          ? styles.badgeSuccess
                          : info.status === "surplus"
                          ? styles.badgeInfo
                          : styles.badgeDanger
                      }`.trim()}
                    >
                      <img
                        src={
                          info.status === "shortage"
                            ? TriangleAlertIcon
                            : CircleCheckIcon
                        }
                        alt=""
                        className={styles.badgeIcon}
                      />
                      {info.formatted}
                    </span>
                  );
                })()}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default CashDiscrepanciesSummary;
