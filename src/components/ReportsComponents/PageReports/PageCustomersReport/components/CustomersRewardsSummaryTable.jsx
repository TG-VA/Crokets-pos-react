/**
 * CustomersRewardsSummaryTable.jsx
 * Tabla de canjes de recompensas y uso de puntos por clientes con paginación.
 */

import React, { useState, useEffect, useMemo } from "react";
import styles from "./CustomersComponents.module.css";
import {
  formatCurrency,
  formatNumber,
  formatShortDate,
  formatShortTime,
} from "../utils/customersReportFormatters";
import giftsIcon from "../../../../../assets/icons/gifts-solid-full.svg";
import { usePagination } from "../../../../../hooks/usePagination";

const CustomersRewardsSummaryTable = ({
  redemptions = [],
  onSelectCustomer,
}) => {
  const {
    currentPage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    pageItems,
    resetPagination,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination({
    totalItems: redemptions.length,
    defaultPageSize: 10,
    pageSizeOptions: [10, 25, 50],
  });

  useEffect(() => {
    resetPagination();
  }, [redemptions.length, resetPagination]);

  const totalItems = redemptions.length;

  const totalRewardsUnits = useMemo(() => {
    return redemptions.reduce((acc, r) => acc + (Number(r.quantity) || 1), 0);
  }, [redemptions]);

  const paginatedRedemptions = pageItems(redemptions);

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableCardHeader}>
        <div className={styles.tableCardTitleGroup}>
          <span className={styles.tableCardTitle}>Recompensas y Premios Redimidos</span>
          <span className={styles.tableCardSubtitle}>
            Historial completo de canjes de recompensas efectuados ({totalItems} registros · {formatNumber(totalRewardsUnits)} premios entregados)
          </span>
        </div>
      </div>

      <div className={styles.tableScrollArea}>
        {redemptions.length === 0 ? (
          <div className={styles.emptyContainer}>
            <div className={styles.emptyIconWrapper}>
              <img src={giftsIcon} alt="" style={{ width: 22, height: 22 }} />
            </div>
            <h3 className={styles.emptyTitle}>No hay canjes de recompensas</h3>
            <p className={styles.emptyDescription}>
              No se han registrado canjes de puntos ni recompensas utilizadas.
            </p>
          </div>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th className={styles.alignCenter}>Fecha</th>
                <th className={styles.alignCenter}>Ticket / Sucursal</th>
                <th>Cliente</th>
                <th>Recompensa / Premio</th>
                <th>Producto Aplicado</th>
                <th className={styles.alignCenter}>Cantidad</th>
                <th className={styles.alignRight}>Puntos Canjeados</th>
                <th className={styles.alignRight}>Descuento Bonificado</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRedemptions.map((r) => {
                const shortFolio = r.sale_id ? r.sale_id.substring(0, 8).toUpperCase() : "S/F";

                return (
                  <tr key={r.id}>
                    <td className={styles.alignCenter}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={{ fontSize: "0.8rem", color: "#0f172a", fontWeight: 600 }}>
                          {formatShortDate(r.created_at, r.timezone)}
                        </span>
                        <span style={{ fontSize: "0.725rem", color: "#64748b" }}>
                          {formatShortTime(r.created_at, r.timezone)}
                        </span>
                      </div>
                    </td>
                    <td className={styles.alignCenter}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0284c7", fontSize: "0.8rem" }}>
                          #{shortFolio}
                        </span>
                        <span className={`${styles.badge} ${styles.badgeNeutral}`.trim()}>
                          {r.branch_name || "Sucursal"}
                        </span>
                      </div>
                    </td>
                    <td>
                      {r.customer_id && onSelectCustomer ? (
                        <button
                          type="button"
                          onClick={() => onSelectCustomer(r.customer_id)}
                          className={styles.clickableCustomerName}
                          title="Ver detalle 360° de este cliente"
                        >
                          {r.customer_name}
                        </button>
                      ) : (
                        <span className={styles.cellPrimaryValue}>
                          {r.customer_name || "Cliente General"}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={styles.cellPrimaryValue}>
                        {r.reward_name || "Premio de lealtad"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.825rem", color: "#334155" }}>
                        {r.product_name || "N/A"}
                      </span>
                    </td>
                    <td className={styles.alignCenter}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span className={styles.cellPrimaryValue}>
                          {formatNumber(r.quantity || 1)}
                        </span>
                        <span className={styles.cellSecondaryValue}>
                          {Number(r.quantity || 1) === 1 ? "premio" : "premios"}
                        </span>
                      </div>
                    </td>
                    <td className={styles.alignRight}>
                      <span className={`${styles.badge} ${styles.badgeWarning}`.trim()}>
                        -{formatNumber(r.total_points || 0)} pts
                      </span>
                    </td>
                    <td className={styles.alignRight}>
                      <span className={styles.cellPrimaryValue}>
                        {formatCurrency(r.discount_amount || 0)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Barra de Paginación */}
      {totalItems > 0 && (
        <div className={styles.paginationWrapper}>
          <div className={styles.paginationInfo}>
            <span>
              Mostrando {startIndex + 1} a {endIndex} de {totalItems} canjes
            </span>
            <span>|</span>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              Por página:
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
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
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Anterior
            </button>
            <span className={styles.pageIndicator}>
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => handlePageChange(currentPage + 1)}
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

export default CustomersRewardsSummaryTable;
