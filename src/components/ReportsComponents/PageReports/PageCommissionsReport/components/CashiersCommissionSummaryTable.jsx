import React, { useState, useMemo, useEffect } from "react";
import styles from "./CommissionsComponents.module.css";
import {
  formatCurrency,
  formatInteger,
} from "../utils/commissionsReportFormatters";

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
              <th className={styles.textCenter} style={{ width: "60px" }}>
                #
              </th>
              <th>Cajero / Usuario</th>
              <th>Sucursal</th>
              <th className={styles.textRight}>Tickets</th>
              <th className={styles.textRight}>Piezas</th>
              <th className={styles.textRight}>Venta Comisionable</th>
              <th className={styles.textRight}>Comisión Ganada</th>
              <th className={styles.textCenter} style={{ width: "120px" }}>
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
                  <td className={`${styles.textCenter} ${styles.fontBold}`}>
                    {item.rank}
                  </td>
                  <td className={styles.fontBold}>{item.cashierName}</td>
                  <td>{item.branchName || "Sin sucursal"}</td>
                  <td className={`${styles.textRight} ${styles.fontMono}`}>
                    {formatInteger(item.ticketsCount)}
                  </td>
                  <td className={`${styles.textRight} ${styles.fontMono}`}>
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
                      Ver Desglose
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalItems > 0 && (
        <div className={styles.paginationBar}>
          <div className={styles.paginationInfo}>
            <span>
              Mostrando{" "}
              {Math.min((safeCurrentPage - 1) * pageSize + 1, totalItems)} a{" "}
              {Math.min(safeCurrentPage * pageSize, totalItems)} de {totalItems} cajeros
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
