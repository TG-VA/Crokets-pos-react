import React, { useMemo, useEffect } from "react";
import styles from "./CommissionsComponents.module.css";
import {
  formatCurrency,
  formatDateTime,
  formatInteger,
  formatCommissionRule,
} from "../utils/commissionsReportFormatters";
import { usePagination } from "../../../../../hooks/usePagination";
import PaginationBar from "../../../../../components/PaginationBar/PaginationBar";

export const CommissionsAuditTable = ({ detailedRows = [] }) => {
  // Considerar solo partidas con comisión activa para la auditoría de incentivos
  const commissionableRows = useMemo(() => {
    return detailedRows.filter((row) => row.hasCommission);
  }, [detailedRows]);

  const totalItems = commissionableRows.length;

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

  const paginatedRows = pageItems(commissionableRows);

  const totals = useMemo(() => {
    return commissionableRows.reduce(
      (acc, r) => {
        acc.quantity += Number(r.quantity || 0);
        acc.totalPrice += Number(r.totalPrice || 0);
        acc.discountAmount += Number(r.discountAmount || 0);
        acc.commissionAmount += Number(r.commissionAmount || 0);
        return acc;
      },
      { quantity: 0, totalPrice: 0, discountAmount: 0, commissionAmount: 0 }
    );
  }, [commissionableRows]);

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
              <th style={{ width: "100px" }}>Ticket</th>
              <th style={{ width: "165px", whiteSpace: "nowrap" }}>
                Fecha / Hora
              </th>
              <th style={{ minWidth: "120px" }}>Cajero</th>
              <th style={{ minWidth: "120px" }}>Sucursal</th>
              <th style={{ minWidth: "180px" }}>Producto</th>
              <th className={styles.textCenter} style={{ width: "135px" }}>
                Regla Comisión
              </th>
              <th className={styles.textCenter} style={{ width: "70px" }}>
                Cant.
              </th>
              <th className={styles.textRight} style={{ width: "110px" }}>
                P. Unitario
              </th>
              <th className={styles.textRight} style={{ width: "125px" }}>
                Total Venta
              </th>
              <th
                className={styles.textRight}
                style={{ width: "135px", color: "#0284c7" }}
              >
                Comisión
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={10} className={styles.emptyState}>
                  No hay partidas con comisión para mostrar con los filtros aplicados.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const isPercent =
                  row.commissionType === "percent" ||
                  row.commissionType === "percentage";
                const badgeClass = `${styles.commissionBadge} ${
                  isPercent
                    ? styles.commissionBadgePercent
                    : styles.commissionBadgeFixed
                }`.trim();

                const totalPriceNum = Number(row.totalPrice || 0);
                const commAmountNum = Number(row.commissionAmount || 0);
                const effectivePercent =
                  totalPriceNum > 0
                    ? ((commAmountNum / totalPriceNum) * 100).toFixed(1)
                    : "0.0";

                return (
                  <tr key={`${row.saleId}-${row.detailId}`}>
                    <td className={`${styles.fontMono} ${styles.fontBold}`}>
                      {row.ticketNumber}
                    </td>
                    <td className={`${styles.fontMono} ${styles.cellDateTime}`}>
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className={styles.fontBold}>{row.cashierName}</td>
                    <td>{row.branchName || "Sin sucursal"}</td>
                    <td>
                      <div className={styles.productCellStacked}>
                        <span>{row.productName}</span>
                        {row.barcode && row.barcode !== "---" && (
                          <span className={styles.subtextBarcode}>
                            {row.barcode}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={styles.textCenter}>
                      <span className={badgeClass}>
                        {formatCommissionRule(
                          row.commissionType,
                          row.commissionValue
                        )}
                      </span>
                    </td>
                    <td className={`${styles.textCenter} ${styles.fontMono}`}>
                      {formatInteger(row.quantity)}
                    </td>
                    <td className={`${styles.textRight} ${styles.fontMono}`}>
                      {formatCurrency(row.unitPrice)}
                    </td>
                    <td className={styles.textRight}>
                      <div className={styles.colFinancialValue}>
                        <span className={styles.fontMono}>
                          {formatCurrency(row.totalPrice)}
                        </span>
                        {row.hasDiscount && row.discountAmount > 0 && (
                          <span className={styles.discountSubtext}>
                            Desc. -{formatCurrency(row.discountAmount)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={styles.textRight}>
                      <div className={styles.colCommissionPaid}>
                        <span
                          className={`${styles.fontBold} ${styles.fontMono}`}
                          style={{ color: "#0284c7" }}
                        >
                          {formatCurrency(row.commissionAmount)}
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
                  totals.totalPrice > 0
                    ? (
                        (totals.commissionAmount / totals.totalPrice) *
                        100
                      ).toFixed(1)
                    : "0.0";

                return (
                  <tr className={styles.tableFooterTotal}>
                    <td colSpan={6} className={styles.footerTotalLabel}>
                      Totales Consolidados ({totalItems} partida
                      {totalItems !== 1 ? "s" : ""})
                    </td>
                    <td className={`${styles.textCenter} ${styles.fontMono}`}>
                      {formatInteger(totals.quantity)}
                    </td>
                    <td
                      className={styles.textCenter}
                      style={{ color: "#94a3b8" }}
                    >
                      ---
                    </td>
                    <td className={styles.textRight}>
                      <div className={styles.colFinancialValue}>
                        <span className={styles.fontMono}>
                          {formatCurrency(totals.totalPrice)}
                        </span>
                        {totals.discountAmount > 0 && (
                          <span className={styles.discountSubtext}>
                            -{formatCurrency(totals.discountAmount)} desc.
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={styles.textRight}>
                      <div className={styles.colCommissionPaid}>
                        <span
                          className={`${styles.fontBold} ${styles.fontMono}`}
                          style={{ color: "#0284c7" }}
                        >
                          {formatCurrency(totals.commissionAmount)}
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
          itemsNoun="registros"
          selectorLabel="Mostrar:"
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
};
