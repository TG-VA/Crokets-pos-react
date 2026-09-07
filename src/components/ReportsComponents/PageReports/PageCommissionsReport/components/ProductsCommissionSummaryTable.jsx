import React, { useState, useMemo, useEffect } from "react";
import styles from "./CommissionsComponents.module.css";
import {
  formatCurrency,
  formatInteger,
  formatCommissionRule,
} from "../utils/commissionsReportFormatters";

export const ProductsCommissionSummaryTable = ({
  productSummaries = [],
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = productSummaries.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [totalItems]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return productSummaries.slice(startIndex, startIndex + pageSize);
  }, [productSummaries, safeCurrentPage, pageSize]);

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableHeaderBar}>
        <div>
          <h3 className={styles.tableTitle}>Desglose por Producto Comisionable</h3>
          <span className={styles.tableSubtitle}>
            Rendimiento y costo total de incentivos por artículo
          </span>
        </div>
      </div>

      <div className={styles.tableResponsive}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th style={{ width: "130px" }}>Código</th>
              <th>Producto</th>
              <th>Departamento</th>
              <th className={styles.textCenter} style={{ width: "130px" }}>
                Regla Comisión
              </th>
              <th className={styles.textRight}>Piezas Vendidas</th>
              <th className={styles.textRight}>Venta Total</th>
              <th className={styles.textRight}>Comisión Pagada</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  No se registraron ventas de productos comisionables en este periodo.
                </td>
              </tr>
            ) : (
              paginatedProducts.map((item) => {
                const isPercent = item.commissionType === "percent";
                const badgeClass = `${styles.commissionBadge} ${
                  isPercent
                    ? styles.commissionBadgePercent
                    : styles.commissionBadgeFixed
                }`.trim();

                return (
                  <tr key={item.productId}>
                    <td className={styles.fontMono}>{item.barcode || "S/C"}</td>
                    <td className={styles.fontBold}>{item.productName}</td>
                    <td>{item.departmentName || "Sin depto."}</td>
                    <td className={styles.textCenter}>
                      <span className={badgeClass}>
                        {formatCommissionRule(item.commissionType, item.commissionValue)}
                      </span>
                    </td>
                    <td className={`${styles.textRight} ${styles.fontMono}`}>
                      {formatInteger(item.unitsSold)}
                    </td>
                    <td className={`${styles.textRight} ${styles.fontMono}`}>
                      {formatCurrency(item.totalSales)}
                    </td>
                    <td
                      className={`${styles.textRight} ${styles.fontBold} ${styles.fontMono}`}
                      style={{ color: "#0284c7" }}
                    >
                      {formatCurrency(item.totalCommissionPaid)}
                    </td>
                  </tr>
                );
              })
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
              productos
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
