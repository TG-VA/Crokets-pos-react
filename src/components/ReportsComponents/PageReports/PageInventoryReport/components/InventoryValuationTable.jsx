import React, { useState, useMemo, useEffect } from "react";
import styles from "./InventoryComponents.module.css";
import { formatCurrency } from "../../../../../utils/formatters";
import { getStatusBadge } from "../utils/inventoryReportUtils";
import { usePagination } from "../../../../../hooks/usePagination";

const InventoryValuationTable = ({
  items = [],
  isLoading = false,
  title = "Existencias y Valorización",
  subtitle,
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
    totalItems: items.length,
    defaultPageSize: 10,
    pageSizeOptions: [10, 25, 50],
  });

  // Resetear a página 1 cuando la longitud o el filtrado de items cambie
  useEffect(() => {
    resetPagination();
  }, [items.length, resetPagination]);

  const currentItems = useMemo(() => pageItems(items), [pageItems, items]);

  if (isLoading) {
    return (
      <div className={styles.tableCard}>
        <div className={styles.emptyState}>Cargando existencias del inventario...</div>
      </div>
    );
  }

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableHeaderBar}>
        <div>
          <h3 className={styles.tableTitle}>{title}</h3>
          <span className={styles.tableSubtitle}>
            {subtitle || `Mostrando ${items.length} producto(s) encontrado(s)`}
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
              <th className={styles.textRight}>Costo Unit.</th>
              <th className={styles.textRight}>Precio Venta</th>
              <th className={styles.textRight}>Total Costo</th>
              <th className={styles.textRight}>Total Venta</th>
              <th className={styles.textCenter}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={10} className={styles.emptyState}>
                  No se encontraron productos con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              currentItems.map((item) => (
                <tr key={item.id}>
                  <td className={styles.fontMono}>{item.barcode || "---"}</td>
                  <td className={styles.fontBold}>{item.name}</td>
                  <td>{item.departmentName}</td>
                  <td className={`${styles.textRight} ${styles.fontBold}`}>
                    {item.tracks_inventory ? item.stock.toLocaleString() : "---"}
                  </td>
                  <td className={`${styles.textRight} ${styles.fontMono}`}>
                    {item.tracks_inventory ? `${item.min_stock} / ${item.max_stock}` : "---"}
                  </td>
                  <td className={styles.textRight}>{formatCurrency(item.cost_price)}</td>
                  <td className={styles.textRight}>{formatCurrency(item.sale_price)}</td>
                  <td className={`${styles.textRight} ${styles.fontBold}`}>
                    {formatCurrency(item.total_cost)}
                  </td>
                  <td className={styles.textRight}>{formatCurrency(item.total_sale)}</td>
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
              Mostrando {startIndex + 1} a {endIndex} de {items.length} productos
            </span>
            <span className={styles.paginationDivider}>|</span>
            <label className={styles.pageSizeLabel}>
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

          <div className={styles.paginationActions}>
            <button
              type="button"
              className={styles.btnPagination}
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Anterior
            </button>
            <span className={styles.pageIndicator}>
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              className={styles.btnPagination}
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryValuationTable;
