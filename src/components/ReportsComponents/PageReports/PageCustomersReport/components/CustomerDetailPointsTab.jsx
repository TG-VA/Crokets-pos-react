/**
 * CustomerDetailPointsTab.jsx
 * Pestaña con la bitácora de puntos de lealtad del cliente y su paginación.
 */

import React from "react";
import styles from "./CustomersComponents.module.css";
import { formatNumber, formatDynamicDate } from "../utils/customersReportFormatters";
import { usePagination } from "../../../../../hooks/usePagination";
import PaginationBar from "../../../../../components/PaginationBar/PaginationBar";

const CustomerDetailPointsTab = ({ pointsLedger = [] }) => {
  const {
    currentPage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    pageItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination({
    totalItems: pointsLedger.length,
    defaultPageSize: 10,
    pageSizeOptions: [10, 25, 50],
  });

  const totalPoints = pointsLedger.length;
  const paginatedPoints = pageItems(pointsLedger);

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
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalPoints}
              pageSize={pageSize}
              pageSizeOptions={[10, 25, 50]}
              startIndex={startIndex}
              endIndex={endIndex}
              itemsNoun="movimientos"
              modal
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </>
      )}
    </div>
  );
};

export default CustomerDetailPointsTab;
