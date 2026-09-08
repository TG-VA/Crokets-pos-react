import React, { useState, useMemo, useEffect } from "react";
import styles from "./CommissionsComponents.module.css";
import {
  formatCurrency,
  formatInteger,
} from "../utils/commissionsReportFormatters";
import eyeIcon from "../../../../../assets/icons/eye-solid-full.svg";

export const CashiersCommissionSummaryTable = ({
  cashierSummaries = [],
  onViewDetail,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = cashierSummaries.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [totalItems]);

  const paginatedCashiers = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return cashierSummaries.slice(startIndex, startIndex + pageSize);
  }, [cashierSummaries, safeCurrentPage, pageSize]);

  // Sumatoria consolidada para el pie de tabla
  const totals = useMemo(() => {
    return cashierSummaries.reduce(
      (acc, c) => {
        acc.tickets += Number(c.ticketsCount || 0);
        acc.pieces += Number(c.commissionablePieces || 0);
        acc.sales += Number(c.commissionableSales || 0);
        acc.commissions += Number(c.totalCommission || 0);
        return acc;
      },
      { tickets: 0, pieces: 0, sales: 0, commissions: 0 }
    );
  }, [cashierSummaries]);

  const getRankBadgeClass = (rank) => {
    if (rank === 1) return styles.rankGold;
    if (rank === 2) return styles.rankSilver;
    if (rank === 3) return styles.rankBronze;
    return styles.rankNormal;
  };

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableHeaderBar}>
        <div>
          <h3 className={styles.tableTitle}>Resumen de Comisiones por Cajero</h3>
          <span className={styles.tableSubtitle}>
            Ranking y montos acumulados por usuario en el periodo
          </span>
        </div>
      </div>

      <div className={styles.tableResponsive}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th className={styles.textCenter} style={{ width: "55px" }}>
                #
              </th>
              <th style={{ minWidth: "180px" }}>Cajero / Usuario</th>
              <th style={{ minWidth: "140px" }}>Sucursal</th>
              <th className={styles.textCenter} style={{ width: "100px" }}>
                Tickets
              </th>
              <th className={styles.textCenter} style={{ width: "100px" }}>
                Piezas
              </th>
              <th className={styles.textRight} style={{ width: "150px" }}>
                Venta Comisionable
              </th>
              <th className={styles.textRight} style={{ width: "150px" }}>
                Comisión Ganada
              </th>
              <th className={styles.textCenter} style={{ width: "140px" }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedCashiers.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyState}>
                  No se encontraron comisiones registradas para este periodo o filtro.
                </td>
              </tr>
            ) : (
              paginatedCashiers.map((item) => (
                <tr key={item.cashierId}>
                  <td className={styles.textCenter}>
                    <span
                      className={`${styles.rankBadge} ${getRankBadgeClass(
                        item.rank
                      )}`}
                    >
                      {item.rank}
                    </span>
                  </td>
                  <td className={styles.fontBold}>{item.cashierName}</td>
                  <td>{item.branchName || "Sin sucursal"}</td>
                  <td className={`${styles.textCenter} ${styles.fontMono}`}>
                    {formatInteger(item.ticketsCount)}
                  </td>
                  <td className={`${styles.textCenter} ${styles.fontMono}`}>
                    {formatInteger(item.commissionablePieces)}
                  </td>
                  <td className={`${styles.textRight} ${styles.fontMono}`}>
                    {formatCurrency(item.commissionableSales)}
                  </td>
                  <td
                    className={`${styles.textRight} ${styles.fontBold} ${styles.fontMono}`}
                    style={{ color: "#0284c7" }}
                  >
                    {formatCurrency(item.totalCommission)}
                  </td>
                  <td className={styles.textCenter}>
                    <button
                      type="button"
                      className={styles.btnDetail}
                      onClick={() => onViewDetail(item)}
                    >
                      <img
                        src={eyeIcon}
                        alt=""
                        className={styles.btnDetailIcon}
                      />
                      <span>Ver Desglose</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {totalItems > 0 && (
            <tfoot>
              <tr className={styles.tableFooterTotal}>
                <td colSpan={3} className={styles.footerTotalLabel}>
                  Totales Consolidados ({totalItems} cajero{totalItems !== 1 ? "s" : ""})
                </td>
                <td className={`${styles.textCenter} ${styles.fontMono}`}>
                  {formatInteger(totals.tickets)}
                </td>
                <td className={`${styles.textCenter} ${styles.fontMono}`}>
                  {formatInteger(totals.pieces)}
                </td>
                <td className={`${styles.textRight} ${styles.fontMono}`}>
                  {formatCurrency(totals.sales)}
                </td>
                <td
                  className={`${styles.textRight} ${styles.fontBold} ${styles.fontMono}`}
                  style={{ color: "#0284c7" }}
                >
                  {formatCurrency(totals.commissions)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {totalItems > 0 && (
        <div className={styles.paginationBar}>
          <div className={styles.paginationInfo}>
            <span>
              Mostrando{" "}
              {Math.min((safeCurrentPage - 1) * pageSize + 1, totalItems)} a{" "}
              {Math.min(safeCurrentPage * pageSize, totalItems)} de {totalItems}{" "}
              cajeros
            </span>
            <span className={styles.paginationDivider}>|</span>
            <label className={styles.pageSizeLabel}>
              Mostrar:
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className={styles.pageSizeSelect}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          <div className={styles.paginationActions}>
            <button
              type="button"
              className={styles.btnPagination}
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              Anterior
            </button>
            <span className={styles.pageIndicator}>
              Pág. {safeCurrentPage} de {totalPages}
            </span>
            <button
              type="button"
              className={styles.btnPagination}
              disabled={safeCurrentPage >= totalPages}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
