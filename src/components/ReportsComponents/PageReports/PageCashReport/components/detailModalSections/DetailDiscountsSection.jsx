import React, { useState } from "react";
import styles from "../CashComponents.module.css";
import { formatCurrency, formatDynamicDate } from "../../utils/cashReportFormatters";

const ITEMS_PER_PAGE = 5;

const DetailDiscountsSection = ({ sessionDetail, discountsList = [], branchTz }) => {
  const [discountsPage, setDiscountsPage] = useState(1);

  const totalDiscountsPages = Math.ceil(discountsList.length / ITEMS_PER_PAGE) || 1;
  const paginatedDiscounts = discountsList.slice(
    (discountsPage - 1) * ITEMS_PER_PAGE,
    discountsPage * ITEMS_PER_PAGE
  );

  return (
    <div className={styles.modalSection}>
      <h3 className={styles.modalSectionTitle}>Descuentos y Recompensas del Turno</h3>
      <p className={styles.modalSectionExplanation}>
        Auditoría de descuentos comerciales aplicados y puntos de lealtad canjeados en el turno.
      </p>

      <div className={styles.detailGrid4}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Descuentos Otorgados</span>
          <span
            className={`${styles.detailValue} ${
              sessionDetail.totalDiscounts > 0 ? styles.textWarning : styles.textDark
            }`}
          >
            {formatCurrency(sessionDetail.totalDiscounts)}
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Tickets c/ Descuento</span>
          <span className={styles.detailValue}>
            {sessionDetail.discountedSalesCount || 0} de {sessionDetail.salesCount || 0}
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Canjes de Recompensas</span>
          <span
            className={`${styles.detailValue} ${
              sessionDetail.totalRedemptions > 0 ? styles.textPurple : styles.textDark
            }`}
          >
            {sessionDetail.totalRedemptions || 0} artículo(s)
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Puntos Redimidos</span>
          <span
            className={`${styles.detailValue} ${
              sessionDetail.totalPointsUsed > 0 ? styles.textPurple : styles.textDark
            }`}
          >
            {sessionDetail.totalPointsUsed || 0} pts
          </span>
        </div>
      </div>

      {/* Tabla de detalle de descuentos y canjes (paginada de 5 en 5) */}
      {discountsList.length > 0 && (
        <div className={`${styles.tableResponsive} ${styles.modalTableTopMargin}`}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Producto / Concepto</th>
                <th>Tipo</th>
                <th className={styles.cellCenter}>Cant.</th>
                <th>Descuento</th>
                <th>Puntos</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDiscounts.map((item) => (
                <tr key={item.id}>
                  <td className={styles.cellNowrap}>
                    {formatDynamicDate(item.createdAt, branchTz)}
                  </td>
                  <td className={styles.cellSemiBold}>{item.name}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        item.isReward
                          ? styles.badgePurple
                          : item.discountType.includes("Catálogo")
                          ? styles.badgeInfo
                          : styles.badgeWarning
                      }`}
                    >
                      {item.discountType}
                    </span>
                  </td>
                  <td className={`${styles.cellCenter} ${styles.cellSemiBold}`}>
                    {item.quantity}
                  </td>
                  <td className={item.discountAmount > 0 ? styles.textWarning : styles.textMuted}>
                    {item.discountAmount > 0
                      ? `-${formatCurrency(item.discountAmount)}`
                      : "—"}
                  </td>
                  <td className={item.points > 0 ? styles.textPurple : styles.textMuted}>
                    {item.points > 0 ? `${item.points} pts` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginador de Descuentos (de 5 en 5) */}
          {totalDiscountsPages > 1 && (
            <div className={`${styles.paginationWrapper} ${styles.modalPaginationWrapper}`}>
              <p className={styles.paginationInfo}>
                Página {discountsPage} de {totalDiscountsPages} ({discountsList.length} productos)
              </p>
              <div className={styles.paginationControls}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setDiscountsPage((p) => Math.max(p - 1, 1))}
                  disabled={discountsPage <= 1}
                >
                  Anterior
                </button>
                <span className={styles.pageIndicator}>{discountsPage}</span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setDiscountsPage((p) => Math.min(p + 1, totalDiscountsPages))}
                  disabled={discountsPage >= totalDiscountsPages}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DetailDiscountsSection;
