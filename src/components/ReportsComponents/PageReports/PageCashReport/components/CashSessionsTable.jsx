import React from "react";
import styles from "./CashComponents.module.css";
import {
  formatCurrency,
  formatDynamicDate,
  getShortFolio,
  getDifferenceStatus,
} from "../utils/cashReportFormatters";

import ClockIcon from "../../../../../assets/icons/clock-solid-full.svg";
import EyeIcon from "../../../../../assets/icons/eye-solid-full.svg";
import CircleCheckIcon from "../../../../../assets/icons/circle-check-solid-full.svg";
import TriangleAlertIcon from "../../../../../assets/icons/triangle-exclamation-solid-full.svg";

const CashSessionsTable = ({
  sessions = [],
  allSessions = [],
  loading = false,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
  onOpenDetail,
}) => {
  // Lista de referencia para totales consolidados
  const targetSessions = allSessions.length > 0 ? allSessions : sessions;

  const totalOpening = targetSessions.reduce((acc, s) => acc + Number(s.opening_amount || 0), 0);
  const totalCashSales = targetSessions.reduce((acc, s) => acc + Number(s.cashSales || 0), 0);
  const totalCardSales = targetSessions.reduce((acc, s) => acc + Number(s.cardSales || 0), 0);
  const totalSalesVolume = targetSessions.reduce((acc, s) => acc + Number(s.totalSales || 0), 0);
  const totalCountedCash = targetSessions
    .filter((s) => s.status === "closed")
    .reduce((acc, s) => acc + Number(s.closing_amount || 0), 0);
  const totalNetDiff = targetSessions
    .filter((s) => s.status === "closed")
    .reduce((acc, s) => acc + Number(s.difference || 0), 0);
  const totalDiffInfo = getDifferenceStatus(totalNetDiff);
  if (loading) {
    return (
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <div className={styles.tableCardTitleGroup}>
            <h2 className={styles.tableCardTitle}>Historial de Turnos y Cortes de Caja</h2>
            <p className={styles.tableCardSubtitle}>Cargando sesiones registradas...</p>
          </div>
        </div>
        <div className={styles.tableResponsive}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Apertura / Cierre</th>
                <th>Sucursal & Cajero</th>
                <th>Fondo Inicial</th>
                <th>Ventas Efectivo</th>
                <th>Ventas Tarjeta</th>
                <th>Total Turno</th>
                <th>Efectivo Contado</th>
                <th>Diferencia</th>
                <th>Estado</th>
                <th className={styles.cellHeaderAction}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  {Array.from({ length: 11 }).map((_, idx) => (
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

  if (sessions.length === 0) {
    return (
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <div className={styles.tableCardTitleGroup}>
            <h2 className={styles.tableCardTitle}>Historial de Turnos y Cortes de Caja</h2>
            <p className={styles.tableCardSubtitle}>
              Consulta todas las aperturas, ventas, arqueos y cierres por cajero.
            </p>
          </div>
        </div>
        <div className={styles.emptyState}>
          <img src={ClockIcon} alt="Sin sesiones" className={styles.emptyStateIcon} />
          <h3 className={styles.emptyStateTitle}>No se encontraron turnos de caja</h3>
          <p className={styles.emptyStateText}>
            No hay registros de sesiones o cortes de caja en el rango de fechas y filtros seleccionados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableCardHeader}>
        <div className={styles.tableCardTitleGroup}>
          <h2 className={styles.tableCardTitle}>Historial de Turnos y Cortes de Caja</h2>
          <p className={styles.tableCardSubtitle}>
            {totalItems} turno(s) registrado(s) en el periodo consultado.
          </p>
        </div>
      </div>

      <div className={styles.tableResponsive}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Folio</th>
              <th>Apertura / Cierre</th>
              <th>Sucursal & Cajero</th>
              <th>Fondo Inicial</th>
              <th>Ventas Efectivo</th>
              <th>Ventas Tarjeta</th>
              <th>Total Turno</th>
              <th>Efectivo Contado</th>
              <th>Diferencia</th>
              <th>Estado</th>
              <th className={styles.cellHeaderAction}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const isClosed = session.status === "closed";
              const diffInfo = getDifferenceStatus(session.difference);
              const branchTz = session.branches?.timezone || "America/Cancun";
              const cashSales = Number(session.cashSales || 0);
              const cardSales = Number(session.cardSales || 0);
              const totalSales = Number(session.totalSales || 0);

              return (
                <tr
                  key={session.id}
                  className={`${styles.dataTableRow} ${styles.clickableRow} ${!isClosed ? styles.activeSessionRow : ""}`.trim()}
                  onClick={() => onOpenDetail(session.id)}
                >
                  {/* Folio */}
                  <td className={styles.cellFolio}>
                    {getShortFolio(session.id)}
                  </td>

                  {/* Apertura / Cierre en 2 líneas */}
                  <td>
                    <div className={styles.colDateTime}>
                      <span className={styles.colDateTimeOpen}>
                        <strong className={styles.datePrefixLabel}>A: </strong>
                        {formatDynamicDate(session.opened_at, branchTz)}
                      </span>
                      <span className={session.closed_at ? styles.colDateTimeClose : styles.colDateTimeOngoing}>
                        <strong className={styles.datePrefixLabel}>C: </strong>
                        {session.closed_at
                          ? formatDynamicDate(session.closed_at, branchTz)
                          : "En curso"}
                      </span>
                    </div>
                  </td>

                  {/* Sucursal & Cajero en 2 líneas */}
                  <td>
                    <div className={styles.colBranchUser}>
                      <span className={styles.branchNameText}>
                        {session.branches?.name || "Sucursal"}
                      </span>
                      <strong className={styles.cashierNameText}>
                        {session.users?.username
                          ? String(session.users.username).toUpperCase()
                          : "USUARIO"}
                      </strong>
                    </div>
                  </td>

                  {/* Fondo Inicial */}
                  <td>{formatCurrency(session.opening_amount)}</td>

                  {/* Ventas en Efectivo */}
                  <td className={cashSales > 0 ? styles.textSuccess : styles.textMuted}>
                    {formatCurrency(cashSales)}
                  </td>

                  {/* Ventas en Tarjeta / Digital */}
                  <td className={cardSales > 0 ? styles.textPrimary : styles.textMuted}>
                    {formatCurrency(cardSales)}
                  </td>

                  {/* Total Turno */}
                  <td className={styles.cellBold}>
                    {formatCurrency(totalSales)}
                  </td>

                  {/* Efectivo Contado */}
                  <td className={styles.cellBold}>
                    {isClosed ? formatCurrency(session.closing_amount) : "—"}
                  </td>

                  {/* Diferencia */}
                  <td>
                    {isClosed ? (
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
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeNeutral}`.trim()}>
                        Pendiente
                      </span>
                    )}
                  </td>

                  {/* Estado */}
                  <td>
                    <span
                      className={`${styles.badge} ${
                        isClosed ? styles.badgeNeutral : styles.badgeWarning
                      }`.trim()}
                    >
                      {isClosed ? "Cerrada" : "Abierta"}
                    </span>
                  </td>

                  {/* Botón de Detalle */}
                  <td className={styles.cellActionBtn} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={() => onOpenDetail(session.id)}
                      title="Ver desglose completo del turno"
                    >
                      <img src={EyeIcon} alt="" className={styles.badgeIcon} />
                      Detalle
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={styles.tableFooterTotal}>
              <td colSpan={3} className={styles.cellExtraBold}>
                Totales Consolidados ({targetSessions.length} turno{targetSessions.length !== 1 ? "s" : ""})
              </td>
              <td>{formatCurrency(totalOpening)}</td>
              <td className={styles.textSuccess}>{formatCurrency(totalCashSales)}</td>
              <td className={styles.textPrimary}>{formatCurrency(totalCardSales)}</td>
              <td className={`${styles.cellExtraBold} ${styles.textDark}`}>{formatCurrency(totalSalesVolume)}</td>
              <td>{formatCurrency(totalCountedCash)}</td>
              <td>
                <span
                  className={`${styles.badge} ${
                    totalDiffInfo.status === "exact"
                      ? styles.badgeSuccess
                      : totalDiffInfo.status === "surplus"
                      ? styles.badgeInfo
                      : styles.badgeDanger
                  }`.trim()}
                >
                  <img
                    src={
                      totalDiffInfo.status === "shortage"
                        ? TriangleAlertIcon
                        : CircleCheckIcon
                    }
                    alt=""
                    className={styles.badgeIcon}
                  />
                  {totalDiffInfo.formatted}
                </span>
              </td>
              <td></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className={styles.paginationWrapper}>
          <p className={styles.paginationInfo}>
            Página {currentPage} de {totalPages} ({totalItems} turnos)
          </p>
          <div className={styles.paginationControls}>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Anterior
            </button>
            <span className={styles.pageIndicator}>{currentPage}</span>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashSessionsTable;
