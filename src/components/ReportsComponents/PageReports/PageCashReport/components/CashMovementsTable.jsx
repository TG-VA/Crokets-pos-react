import React from "react";
import styles from "./CashComponents.module.css";
import {
  formatCurrency,
  formatDynamicDate,
  getShortFolio,
  formatMovementType,
} from "../utils/cashReportFormatters";

import EntryIcon from "../../../../../assets/icons/entryIcon.svg";
import ExitIcon from "../../../../../assets/icons/exitIcon.svg";

const CashMovementsTable = ({
  movements = [],
  loading = false,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
}) => {
  if (loading) {
    return (
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <div className={styles.tableCardTitleGroup}>
            <h2 className={styles.tableCardTitle}>Bitácora de Movimientos de Efectivo</h2>
            <p className={styles.tableCardSubtitle}>Cargando entradas y salidas...</p>
          </div>
        </div>
        <div className={styles.tableResponsive}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Concepto / Descripción</th>
                <th>Cajero</th>
                <th>Sucursal</th>
                <th>Folio Turno</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
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

  if (movements.length === 0) {
    return (
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <div className={styles.tableCardTitleGroup}>
            <h2 className={styles.tableCardTitle}>Bitácora de Movimientos de Efectivo</h2>
            <p className={styles.tableCardSubtitle}>
              Registro de entradas y retiros manuales fuera del flujo de ventas.
            </p>
          </div>
        </div>
        <div className={styles.emptyState}>
          <img src={EntryIcon} alt="Sin movimientos" className={styles.emptyStateIcon} />
          <h3 className={styles.emptyStateTitle}>No se registraron movimientos de efectivo</h3>
          <p className={styles.emptyStateText}>
            No hay ingresos manuales ni retiros de efectivo registrados en el rango de fechas seleccionado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableCardHeader}>
        <div className={styles.tableCardTitleGroup}>
          <h2 className={styles.tableCardTitle}>Bitácora de Movimientos de Efectivo</h2>
          <p className={styles.tableCardSubtitle}>
            {totalItems} movimiento(s) registrado(s) en el periodo.
          </p>
        </div>
      </div>

      <div className={styles.tableResponsive}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Fecha / Hora</th>
              <th>Tipo</th>
              <th>Monto</th>
              <th>Concepto / Descripción</th>
              <th>Cajero</th>
              <th>Sucursal</th>
              <th>Folio Turno</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((mov) => {
              const typeInfo = formatMovementType(mov.movement_type);
              const branchTz = mov.branches?.timezone || "America/Cancun";

              return (
                <tr key={mov.id} className={styles.dataTableRow}>
                  <td className={styles.cellNowrap}>
                    {formatDynamicDate(mov.created_at, branchTz)}
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        typeInfo.isPositive ? styles.badgeSuccess : styles.badgeDanger
                      }`}
                    >
                      <img
                        src={typeInfo.isPositive ? EntryIcon : ExitIcon}
                        alt=""
                        className={styles.badgeIcon}
                      />
                      {typeInfo.label}
                    </span>
                  </td>
                  <td
                    className={typeInfo.isPositive ? styles.textSuccess : styles.textDanger}
                  >
                    {typeInfo.isPositive ? "+" : "-"}
                    {formatCurrency(mov.amount)}
                  </td>
                  <td className={styles.cellDescMovements}>
                    {mov.description || "Sin descripción"}
                  </td>
                  <td className={styles.cellSemiBold}>
                    {mov.users?.username
                      ? String(mov.users.username).toUpperCase()
                      : "USUARIO"}
                  </td>
                  <td>{mov.branches?.name || "Sucursal"}</td>
                  <td className={styles.cellFolio}>
                    {getShortFolio(mov.session_id)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className={styles.paginationWrapper}>
          <p className={styles.paginationInfo}>
            Página {currentPage} de {totalPages} ({totalItems} movimientos)
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

export default CashMovementsTable;
