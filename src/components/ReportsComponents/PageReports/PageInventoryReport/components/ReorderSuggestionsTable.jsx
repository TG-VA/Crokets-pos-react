import React, { useState, useMemo, useEffect } from "react";
import styles from "./InventoryComponents.module.css";
import { formatCurrency } from "../../../../../utils/formatters";
import { getStatusBadge } from "../utils/inventoryReportUtils";

const ReorderSuggestionsTable = ({ items = [], isLoading = false }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(items.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Resetear a página 1 cuando la longitud o el filtrado de items cambie
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  const currentItems = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, safeCurrentPage, pageSize]);

  const totalEstimatedInvestment = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.estimatedInvestment || 0), 0);
  }, [items]);

  const totalSuggestedUnits = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.suggestedQty || 0), 0);
  }, [items]);

  if (isLoading) {
    return (
      <div className={styles.tableCard}>
        <div className={styles.emptyState}>Calculando sugerencias de reabastecimiento...</div>
      </div>
    );
  }

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableHeaderBar}>
        <div>
          <h3 className={styles.tableTitle}>Sugerencias de Reorden y Compras</h3>
          <span className={styles.tableSubtitle}>
            {items.length} producto(s) requieren reabastecimiento urgente
          </span>
        </div>

        <div className={styles.reorderHeaderInvestment}>
          <span className={styles.reorderInvestmentSub}>
            Inversión Estimada Total:
          </span>
          <strong className={styles.reorderInvestmentAmount}>
            {formatCurrency(totalEstimatedInvestment)}
          </strong>
          <span className={styles.reorderInvestmentPieces}>
            ({totalSuggestedUnits.toLocaleString()} piezas)
          </span>
        </div>
      </div>

      <div className={styles.tableResponsive}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Departamento</th>
              <th className={styles.textRight}>Stock Actual</th>
              <th className={styles.textRight}>Mín / Máx</th>
              <th className={`${styles.textRight} ${styles.fontBold}`}>Cantidad a Pedir</th>
              <th className={styles.textRight}>Costo Unit.</th>
              <th className={`${styles.textRight} ${styles.fontBold}`}>Inversión Sugerida</th>
              <th className={styles.textCenter}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyState}>
                  Excelente: No hay productos agotados ni por debajo del stock mínimo.
                </td>
              </tr>
            ) : (
              currentItems.map((item) => (
                <tr key={item.id}>
                  <td className={styles.fontMono}>{item.barcode || "---"}</td>
                  <td className={styles.fontBold}>{item.name}</td>
                  <td>{item.departmentName}</td>
                  <td className={`${styles.textRight} ${styles.fontBold}`}>
                    {item.stock.toLocaleString()}
                  </td>
                  <td className={`${styles.textRight} ${styles.fontMono}`}>
                    {`${item.min_stock} / ${item.max_stock}`}
                  </td>
                  <td className={styles.reorderQtyCell}>
                    +{item.suggestedQty.toLocaleString()}
                  </td>
                  <td className={styles.textRight}>{formatCurrency(item.cost_price)}</td>
                  <td className={`${styles.textRight} ${styles.fontBold}`}>
                    {formatCurrency(item.estimatedInvestment)}
                  </td>
                  <td className={styles.textCenter}>
                    {getStatusBadge(item.status, item.statusLabel)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {items.length > 0 && (
        <div className={styles.paginationBar}>
          <div className={styles.paginationInfo}>
            <span>
              Mostrando {Math.min((safeCurrentPage - 1) * pageSize + 1, items.length)} a{" "}
              {Math.min(safeCurrentPage * pageSize, items.length)} de {items.length} sugerencias
            </span>
            <span className={styles.paginationDivider}>|</span>
            <label className={styles.pageSizeLabel}>
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

          <div className={styles.paginationActions}>
            <button
              type="button"
              className={styles.btnPagination}
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              Anterior
            </button>
            <span className={styles.pageIndicator}>
              Página {safeCurrentPage} de {totalPages}
            </span>
            <button
              type="button"
              className={styles.btnPagination}
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReorderSuggestionsTable;
