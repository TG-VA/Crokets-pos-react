import React, { useState } from "react";
import styles from "../CashComponents.module.css";
import { formatCurrency, formatDynamicDate, formatMovementType } from "../../utils/cashReportFormatters";

import EntryIcon from "../../../../../../assets/icons/entryIcon.svg";
import ExitIcon from "../../../../../../assets/icons/exitIcon.svg";

const ITEMS_PER_PAGE = 5;

const DetailMovementsSection = ({ movements = [], branchTz, totalManualIn = 0, totalManualOut = 0 }) => {
  const [movementsPage, setMovementsPage] = useState(1);

  if (!movements || movements.length === 0) return null;

  const totalMovementsPages = Math.ceil(movements.length / ITEMS_PER_PAGE) || 1;
  const paginatedMovements = movements.slice(
    (movementsPage - 1) * ITEMS_PER_PAGE,
    movementsPage * ITEMS_PER_PAGE
  );

  const netBalance = Number(totalManualIn) - Number(totalManualOut);

  return (
    <div className={styles.modalSection}>
      <h3 className={styles.modalSectionTitle}>Movimientos Registrados</h3>
      <p className={styles.modalSectionExplanation}>
        Registro exclusivo de entradas/ingresos y retiros/salidas de efectivo fuera del flujo de ventas.
      </p>
      <div className={styles.tableResponsive}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Hora</th>
              <th>Tipo</th>
              <th>Monto</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {paginatedMovements.map((mov) => {
              const typeInfo = formatMovementType(mov.movement_type);
              return (
                <tr key={mov.id}>
                  <td className={styles.cellNowrap}>
                    {formatDynamicDate(mov.created_at, branchTz)}
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        typeInfo.isPositive
                          ? styles.badgeSuccess
                          : styles.badgeDanger
                      }`.trim()}
                    >
                      <img
                        src={typeInfo.isPositive ? EntryIcon : ExitIcon}
                        alt=""
                        className={styles.badgeIcon}
                      />
                      {typeInfo.label}
                    </span>
                  </td>
                  <td className={typeInfo.isPositive ? styles.textSuccess : styles.textDanger}>
                    {typeInfo.isPositive ? "+" : "-"}
                    {formatCurrency(mov.amount)}
                  </td>
                  <td className={styles.textDescription}>
                    {mov.description || "Sin descripción"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={styles.tableFooterTotal}>
              <td className={styles.cellExtraBold}>Balance Neto</td>
              <td></td>
              <td className={netBalance >= 0 ? styles.textSuccess : styles.textDanger}>
                {netBalance >= 0 ? "+" : ""}
                {formatCurrency(netBalance)}
              </td>
              <td className={styles.textExplanation}>
                (+{formatCurrency(totalManualIn)} entradas / -{formatCurrency(totalManualOut)} retiros)
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Paginación de Movimientos si hay más de 5 */}
      {totalMovementsPages > 1 && (
        <div className={`${styles.paginationWrapper} ${styles.modalPaginationWrapper}`}>
          <p className={styles.paginationInfo}>
            Página {movementsPage} de {totalMovementsPages} ({movements.length} movimientos)
          </p>
          <div className={styles.paginationControls}>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setMovementsPage((p) => Math.max(p - 1, 1))}
              disabled={movementsPage <= 1}
            >
              Anterior
            </button>
            <span className={styles.pageIndicator}>{movementsPage}</span>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setMovementsPage((p) => Math.min(p + 1, totalMovementsPages))}
              disabled={movementsPage >= totalMovementsPages}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailMovementsSection;
