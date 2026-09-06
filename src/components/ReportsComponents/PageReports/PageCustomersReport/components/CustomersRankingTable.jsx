/**
 * CustomersRankingTable.jsx
 * Tabla interactiva de clientes con métricas de gasto, visitas, puntos y estado de riesgo.
 */

import React, { useState, useEffect, useMemo } from "react";
import styles from "./CustomersComponents.module.css";
import {
  formatCurrency,
  formatNumber,
  formatPhoneNumber,
  formatShortDate,
} from "../utils/customersReportFormatters";
import eyeIcon from "../../../../../assets/icons/eye-solid-full.svg";
import userIcon from "../../../../../assets/icons/user-solid.svg";
import chevronDownIcon from "../../../../../assets/icons/chevron-down-solid-full.svg";

const CustomersRankingTable = ({
  customers = [],
  sortBy = "spent",
  sortDirection = "desc",
  onSort,
  onSelectCustomer,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reiniciar a la primera página si cambia la cantidad de clientes o el ordenamiento
  useEffect(() => {
    setCurrentPage(1);
  }, [customers.length, sortBy, sortDirection]);

  const totalItems = customers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return customers.slice(startIndex, startIndex + pageSize);
  }, [customers, safeCurrentPage, pageSize]);

  const renderSortIndicator = (key) => {
    if (sortBy !== key) return null;
    return (
      <img
        src={chevronDownIcon}
        alt=""
        style={{
          width: 9,
          height: 9,
          transform: sortDirection === "asc" ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.15s ease",
          display: "inline-block",
          verticalAlign: "middle",
        }}
      />
    );
  };

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableCardHeader}>
        <div className={styles.tableCardTitleGroup}>
          <span className={styles.tableCardTitle}>Ranking de Clientes</span>
          <span className={styles.tableCardSubtitle}>
            Mostrando {customers.length} cliente{customers.length === 1 ? "" : "s"} según los filtros seleccionados
          </span>
        </div>
      </div>

      <div className={styles.tableScrollArea}>
        {customers.length === 0 ? (
          <div className={styles.emptyContainer}>
            <div className={styles.emptyIconWrapper}>
              <img src={userIcon} alt="" style={{ width: 22, height: 22 }} />
            </div>
            <h3 className={styles.emptyTitle}>No se encontraron clientes</h3>
            <p className={styles.emptyDescription}>
              No hay registros que coincidan con los filtros aplicados o el término de búsqueda.
            </p>
          </div>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th
                  onClick={() => onSort("name")}
                  className={styles.dataTableThSortable}
                >
                  <span className={styles.thContent}>
                    Cliente {renderSortIndicator("name")}
                  </span>
                </th>
                <th
                  onClick={() => onSort("visits")}
                  className={`${styles.dataTableThSortable} ${styles.alignCenter}`.trim()}
                >
                  <span className={styles.thContent}>
                    Visitas {renderSortIndicator("visits")}
                  </span>
                </th>
                <th
                  onClick={() => onSort("spent")}
                  className={`${styles.dataTableThSortable} ${styles.alignRight}`.trim()}
                >
                  <span className={styles.thContent}>
                    Gasto Total {renderSortIndicator("spent")}
                  </span>
                </th>
                <th
                  onClick={() => onSort("ticket")}
                  className={`${styles.dataTableThSortable} ${styles.alignRight}`.trim()}
                >
                  <span className={styles.thContent}>
                    Ticket Prom. {renderSortIndicator("ticket")}
                  </span>
                </th>
                <th
                  onClick={() => onSort("points")}
                  className={`${styles.dataTableThSortable} ${styles.alignRight}`.trim()}
                >
                  <span className={styles.thContent}>
                    Puntos Saldo {renderSortIndicator("points")}
                  </span>
                </th>
                <th className={styles.alignCenter}>Recompensas</th>
                <th
                  onClick={() => onSort("recent")}
                  className={`${styles.dataTableThSortable} ${styles.alignCenter}`.trim()}
                >
                  <span className={styles.thContent}>
                    Última Compra {renderSortIndicator("recent")}
                  </span>
                </th>
                <th className={styles.alignCenter}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.map((c) => {
                const riskBadge = c.riskInfo;
                return (
                  <tr key={c.id}>
                    <td>
                      <div className={styles.customerNameCell}>
                        <span className={styles.customerName}>{c.name}</span>
                        <div className={styles.customerSubtext}>
                          <span>{formatPhoneNumber(c.phone)}</span>
                          {c.isPointsCustomer && (
                            <span className={`${styles.badge} ${styles.badgePoints}`.trim()}>
                              Puntos
                            </span>
                          )}
                          {c.isBillingCustomer && (
                            <span className={`${styles.badge} ${styles.badgeBilling}`.trim()}>
                              Factura
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={styles.alignCenter}>
                      <span className={styles.cellPrimaryValue}>
                        {formatNumber(c.purchasesCount)}
                      </span>
                    </td>
                    <td className={styles.alignRight}>
                      <span className={styles.cellPrimaryValue}>
                        {formatCurrency(c.totalSpent)}
                      </span>
                      {c.totalDiscounts > 0 && (
                        <div className={styles.cellSecondaryValue}>
                          Desc: {formatCurrency(c.totalDiscounts)}
                        </div>
                      )}
                    </td>
                    <td className={styles.alignRight}>
                      <span className={styles.cellPrimaryValue}>
                        {formatCurrency(c.averageTicket)}
                      </span>
                    </td>
                    <td className={styles.alignRight}>
                      <span className={styles.cellPrimaryValue}>
                        {formatNumber(c.pointsBalance)} pts
                      </span>
                      {c.pointsEarned > 0 && (
                        <div className={styles.cellSecondaryValue}>
                          +{formatNumber(c.pointsEarned)} acum.
                        </div>
                      )}
                    </td>
                    <td className={styles.alignCenter}>
                      <span className={styles.cellPrimaryValue}>
                        {formatNumber(c.rewardsRedeemedCount)}
                      </span>
                      {c.rewardsDiscountSum > 0 && (
                        <div className={styles.cellSecondaryValue}>
                          Ahorro: {formatCurrency(c.rewardsDiscountSum)}
                        </div>
                      )}
                    </td>
                    <td className={styles.alignCenter}>
                      <div className={styles.customerNameCell} style={{ alignItems: "center" }}>
                        <span style={{ fontSize: "0.775rem" }}>
                          {c.lastSaleDate ? formatShortDate(c.lastSaleDate) : "Sin compras"}
                        </span>
                        {riskBadge && (
                          <span
                            className={`${styles.badge} ${
                              styles[riskBadge.className] || styles.badgeNeutral
                            }`.trim()}
                          >
                            {riskBadge.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={styles.alignCenter}>
                      <button
                        type="button"
                        onClick={() => onSelectCustomer(c.id)}
                        className={styles.btnDetail}
                        title="Ver detalle 360° del cliente"
                      >
                        <img src={eyeIcon} alt="" style={{ width: 13, height: 13 }} />
                        Ver Detalle
                      </button>
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
              Mostrando {Math.min((safeCurrentPage - 1) * pageSize + 1, totalItems)} a{" "}
              {Math.min(safeCurrentPage * pageSize, totalItems)} de {totalItems} clientes
            </span>
            <span>|</span>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              Por página:
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
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
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
            >
              Anterior
            </button>
            <span className={styles.pageIndicator}>
              Página {safeCurrentPage} de {totalPages}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersRankingTable;
