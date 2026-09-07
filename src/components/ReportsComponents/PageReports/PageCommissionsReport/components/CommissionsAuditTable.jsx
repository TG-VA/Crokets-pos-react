import React, { useState, useMemo, useEffect } from "react";
import styles from "./CommissionsComponents.module.css";
import {
  formatCurrency,
  formatDateTime,
  formatInteger,
} from "../utils/commissionsReportFormatters";

export const CommissionsAuditTable = ({ detailedRows = [] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Considerar solo partidas con comisión activa para la auditoría de incentivos
  const commissionableRows = useMemo(() => {
    return detailedRows.filter((row) => row.hasCommission);
  }, [detailedRows]);

  const totalItems = commissionableRows.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [totalItems]);

  const paginatedRows = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return commissionableRows.slice(startIndex, startIndex + pageSize);
  }, [commissionableRows, safeCurrentPage, pageSize]);

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableHeaderBar}>
        <div>
          <h3 className={styles.tableTitle}>Auditoría Detallada de Comisiones</h3>
          <span className={styles.tableSubtitle}>
            Trazabilidad ticket por ticket de cada producto que generó incentivo
          </span>
        </div>
      </div>

      <div className={styles.tableResponsive}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th style={{ width: "110px" }}>Ticket</th>
              <th style={{ width: "150px" }}>Fecha / Hora</th>
              <th>Cajero</th>
              <th>Sucursal</th>
              <th>Producto</th>
              <th className={styles.textRight} style={{ width: "80px" }}>
                Cant.
              </th>
              <th className={styles.textRight} style={{ width: "100px" }}>
                P. Unitario
              </th>
              <th className={styles.textRight} style={{ width: "110px" }}>
                Total Venta
              </th>
              <th
                className={`${styles.textRight}`}
                style={{ width: "110px", color: "#0284c7" }}
              >
                Comisión
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyState}>
                  No hay partidas con comisión para mostrar con los filtros aplicados.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => (
                <tr key={`${row.saleId}-${row.detailId}`}>
                  <td className={`${styles.fontMono} ${styles.fontBold}`}>
                    {row.ticketNumber}
                  </td>
                  <td className={styles.fontMono}>
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className={styles.fontBold}>{row.cashierName}</td>
                  <td>{row.branchName || "Sin sucursal"}</td>
                  <td>{row.productName}</td>
                  <td className={`${styles.textRight} ${styles.fontMono}`}>
                    {formatInteger(row.quantity)}
                  </td>
                  <td className={`${styles.textRight} ${styles.fontMono}`}>
                    {formatCurrency(row.unitPrice)}
                  </td>
                  <td className={`${styles.textRight} ${styles.fontMono}`}>
                    {formatCurrency(row.totalPrice)}
                  </td>
                  <td
                    className={`${styles.textRight} ${styles.fontBold} ${styles.fontMono}`}
                    style={{ color: "#0284c7" }}
                  >
                    {formatCurrency(row.commissionAmount)}
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
              {Math.min(safeCurrentPage * pageSize, totalItems)} de {totalItems}{" "}
              registros
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
