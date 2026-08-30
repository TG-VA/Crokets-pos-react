import React from "react";
import styles from "../CashComponents.module.css";
import { formatCurrency, formatDynamicDate } from "../../utils/cashReportFormatters";

import CircleCheckIcon from "../../../../../../assets/icons/circle-check-solid-full.svg";
import TriangleAlertIcon from "../../../../../../assets/icons/triangle-exclamation-solid-full.svg";

const DetailTurnInfoSection = ({ sessionDetail, branchTz, diffInfo, isClosed }) => {
  return (
    <div className={styles.modalSection}>
      <h3 className={styles.modalSectionTitle}>Información del Turno</h3>
      <div className={styles.detailGrid}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Estado</span>
          <span className={styles.detailValue}>
            <span
              className={`${styles.badge} ${
                isClosed ? styles.badgeNeutral : styles.badgeWarning
              }`}
            >
              {isClosed ? "Cerrada" : "Abierta"}
            </span>
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Apertura</span>
          <span className={`${styles.detailValue} ${styles.detailValueSmall}`}>
            {formatDynamicDate(sessionDetail.opened_at, branchTz)}
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Cierre</span>
          <span className={`${styles.detailValue} ${styles.detailValueSmall}`}>
            {sessionDetail.closed_at
              ? formatDynamicDate(sessionDetail.closed_at, branchTz)
              : "En curso"}
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Tickets Cobrados</span>
          <span className={styles.detailValue}>
            {sessionDetail.salesCount || 0} ticket(s)
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Total Vendido</span>
          <span className={`${styles.detailValue} ${styles.textPrimary}`}>
            {formatCurrency(sessionDetail.totalSalesVolume || 0)}
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Diferencia Final</span>
          <span className={styles.detailValue}>
            {isClosed ? (
              <span
                className={`${styles.badge} ${
                  diffInfo.status === "exact"
                    ? styles.badgeSuccess
                    : diffInfo.status === "surplus"
                    ? styles.badgeInfo
                    : styles.badgeDanger
                }`}
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
            ) : (
              <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                Pendiente
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DetailTurnInfoSection;
