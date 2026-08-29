import React, { useState, useMemo } from "react";
import styles from "./InventoryComponents.module.css";
import { formatCurrency } from "../../../../../utils/formatters";
import { ITEMS_PER_PAGE, getStatusBadge } from "../utils/inventoryReportUtils";

const ReorderSuggestionsTable = ({ items = [], isLoading = false }) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;

  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [items, currentPage]);

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

      {totalPages > 1 && (
        <div className={styles.paginationBar}>
          <span>
            Página {currentPage} de {totalPages} ({items.length} sugerencias)
          </span>
          <div className={styles.paginationActions}>
            <button
              type="button"
              className={styles.btnPagination}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              className={styles.btnPagination}
              disabled={currentPage >= totalPages}
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
