/**
 * CustomerDetailPointsTab.jsx
 * Pestaña con la bitácora de puntos de lealtad del cliente y su paginación.
 */

import React, { useState, useMemo } from "react";
import styles from "./CustomersComponents.module.css";
import { formatNumber, formatDynamicDate } from "../utils/customersReportFormatters";

const CustomerDetailPointsTab = ({ pointsLedger = [] }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPoints = pointsLedger.length;
  const totalPages = Math.max(1, Math.ceil(totalPoints / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedPoints = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return pointsLedger.slice(start, start + pageSize);
  }, [pointsLedger, safePage, pageSize]);

  // Obtener título descriptivo y en español para el movimiento
  const getMovementTitle = (row, rawPts, mType) => {
    if (row.rewards?.name) {
      return `Canje: ${row.rewards.name}`;
    }
    if (row.source === "sale") {
      return "Acumulado por Compra";
    }
    if (row.source === "cancellation") {
      return "Cancelación de Venta";
    }
    if (row.source === "partial_return") {
      return "Devolución Parcial";
    }

    const rawNotes = String(row.notes || "").trim();
    if (
      rawNotes &&
      !rawNotes.toUpperCase().includes("PUNTOS GENERADOS") &&
      !rawNotes.toUpperCase().includes("CANJE DE RECOMPENSA")
    ) {
      return `Ajuste: ${rawNotes}`;
    }

    if (
      row.source === "manual" ||
      mType === "earn" ||
      mType === "redeem" ||
      mType === "adjustment"
    ) {
      return rawPts >= 0
        ? "Ajuste Manual (Abono)"
        : "Ajuste Manual (Deducción)";
    }

    return row.movement_type || "Movimiento de Puntos";
  };

  return (
    <div className={styles.tabPanel}>
      <div className={styles.modalSectionTitle}>
        <span>Historial de movimientos y canjes de puntos</span>
      </div>

      {pointsLedger.length === 0 ? (
        <p className={styles.modalEmptyText}>
          No existen movimientos de puntos registrados para este cliente.
        </p>
      ) : (
        <>
          <div className={styles.ledgerList}>
            {paginatedPoints.map((row) => {
              const rawPts = Number(row.points || 0);
              const mType = String(row.movement_type || "").toLowerCase();
              const isNeg =
                mType.includes("canje") ||
                mType.includes("redeem") ||
                mType.includes("used") ||
                rawPts < 0;

              const absPts = Math.abs(rawPts);
              const branchName = row.branches?.name || "";
              const userName = row.users?.username ? `- ${row.users.username}` : "";
              const title = getMovementTitle(row, rawPts, mType);
              const isNotesInTitle =
                row.notes &&
                title.toLowerCase().includes(String(row.notes).trim().toLowerCase());

              return (
                <div key={row.id} className={styles.ledgerItem}>
                  <div className={styles.ledgerItemLeft}>
                    <span className={styles.ledgerSource}>{title}</span>
                    <span className={styles.ledgerMeta}>
                      {formatDynamicDate(row.created_at)} {branchName ? `(${branchName})` : ""} {userName}
                      {row.notes && !isNotesInTitle && ` - ${row.notes}`}
                    </span>
                  </div>

                  <span
                    className={`${styles.ledgerPoints} ${
                      isNeg ? styles.ledgerPointsNegative : styles.ledgerPointsPositive
                    }`.trim()}
                  >
                    {isNeg ? `-${formatNumber(absPts)} pts` : `+${formatNumber(absPts)} pts`}
                  </span>
                </div>
              );
            })}
          </div>

          {totalPoints > 0 && (
            <div className={`${styles.paginationWrapper} ${styles.modalPaginationWrapper}`.trim()}>
              <div className={styles.paginationInfo}>
                <span>
                  Mostrando {Math.min((safePage - 1) * pageSize + 1, totalPoints)} a{" "}
                  {Math.min(safePage * pageSize, totalPoints)} de {totalPoints} movimientos
                </span>
                <span>|</span>
                <label className={styles.paginationLabel}>
                  Por página:
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className={styles.pageSizeSelect}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>

              <div className={styles.paginationControls}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  Anterior
                </button>
                <span className={styles.pageIndicator}>
                  Página {safePage} de {totalPages}
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomerDetailPointsTab;
