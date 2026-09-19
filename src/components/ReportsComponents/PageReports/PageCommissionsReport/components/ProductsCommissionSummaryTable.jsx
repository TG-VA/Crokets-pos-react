import React, { useMemo, useEffect } from "react";
import styles from "./CommissionsComponents.module.css";
import {
  formatCurrency,
  formatInteger,
  formatCommissionRule,
} from "../utils/commissionsReportFormatters";
import { usePagination } from "../../../../../hooks/usePagination";
import PaginationBar from "../../../../../components/PaginationBar/PaginationBar";

export const ProductsCommissionSummaryTable = ({
  productSummaries = [],
}) => {
  const totalItems = productSummaries.length;

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
    totalItems,
    defaultPageSize: 10,
    pageSizeOptions: [10, 25, 50],
  });

  useEffect(() => {
    resetPagination();
  }, [totalItems, resetPagination]);

  const paginatedProducts = pageItems(productSummaries);

  const totals = useMemo(() => {
    return productSummaries.reduce(
      (acc, p) => {
        acc.units += Number(p.unitsSold || 0);
        acc.sales += Number(p.totalSales || 0);
        acc.commissions += Number(p.totalCommissionPaid || 0);
        return acc;
      },
      { units: 0, sales: 0, commissions: 0 }
    );
  }, [productSummaries]);

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
              <th style={{ minWidth: "220px" }}>Producto</th>
              <th style={{ width: "160px" }}>Departamento</th>
              <th className={styles.textCenter} style={{ width: "150px" }}>
                Regla Comisión
              </th>
              <th className={styles.textCenter} style={{ width: "120px" }}>
                Piezas Vendidas
              </th>
              <th className={styles.textRight} style={{ width: "140px" }}>
                Venta Total
              </th>
              <th className={styles.textRight} style={{ width: "160px" }}>
                Comisión Pagada
              </th>
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

                const totalSalesNum = Number(item.totalSales || 0);
                const commissionPaidNum = Number(item.totalCommissionPaid || 0);
                const effectivePercent =
                  totalSalesNum > 0
                    ? ((commissionPaidNum / totalSalesNum) * 100).toFixed(1)
                    : "0.0";

                return (
                  <tr key={item.productId}>
                    <td className={styles.fontMono}>{item.barcode || "S/C"}</td>
                    <td className={styles.fontBold}>{item.productName}</td>
                    <td>
                      <span className={styles.deptPill}>
                        {item.departmentName || "Sin depto."}
                      </span>
                    </td>
                    <td className={styles.textCenter}>
                      <span className={badgeClass}>
                        {formatCommissionRule(item.commissionType, item.commissionValue)}
                      </span>
                    </td>
                    <td className={`${styles.textCenter} ${styles.fontMono}`}>
                      {formatInteger(item.unitsSold)}
                    </td>
                    <td className={`${styles.textRight} ${styles.fontMono}`}>
                      {formatCurrency(item.totalSales)}
                    </td>
                    <td className={styles.textRight}>
                      <div className={styles.colCommissionPaid}>
                        <span
                          className={`${styles.fontBold} ${styles.fontMono}`}
                          style={{ color: "#0284c7" }}
                        >
                          {formatCurrency(item.totalCommissionPaid)}
                        </span>
                        <span className={styles.effectivePercentSubtext}>
                          {effectivePercent}% de venta
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {totalItems > 0 && (
            <tfoot>
              {(() => {
                const overallPercent =
                  totals.sales > 0
                    ? ((totals.commissions / totals.sales) * 100).toFixed(1)
                    : "0.0";

                return (
                  <tr className={styles.tableFooterTotal}>
                    <td colSpan={4} className={styles.footerTotalLabel}>
                      Totales Consolidados ({totalItems} producto{totalItems !== 1 ? "s" : ""})
                    </td>
                    <td className={`${styles.textCenter} ${styles.fontMono}`}>
                      {formatInteger(totals.units)}
                    </td>
                    <td className={`${styles.textRight} ${styles.fontMono}`}>
                      {formatCurrency(totals.sales)}
                    </td>
                    <td className={styles.textRight}>
                      <div className={styles.colCommissionPaid}>
                        <span
                          className={`${styles.fontBold} ${styles.fontMono}`}
                          style={{ color: "#0284c7" }}
                        >
                          {formatCurrency(totals.commissions)}
                        </span>
                        <span className={styles.effectivePercentSubtext}>
                          {overallPercent}% efectivo
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })()}
            </tfoot>
          )}
        </table>
      </div>

      {totalItems > 0 && (
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50]}
          startIndex={startIndex}
          endIndex={endIndex}
          itemsNoun="productos"
          selectorLabel="Mostrar:"
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
};
