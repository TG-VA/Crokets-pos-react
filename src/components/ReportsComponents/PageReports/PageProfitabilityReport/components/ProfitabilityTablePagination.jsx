/**
 * ProfitabilityTablePagination.jsx
 * Control reutilizable de paginación para tablas de reportes de rentabilidad.
 */

import React from "react";
import styles from "./ProfitabilityComponents.module.css";

const ProfitabilityTablePagination = ({
  currentPage = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  return (
    <div className={styles.paginationWrapper}>
      <div className={styles.paginationInfo}>
        <span>
          Mostrando {startItem} a {endItem} de {totalItems} productos
        </span>
        <div className={styles.pageSizeWrapper}>
          <span className={styles.pageSizeLabel}>Por página:</span>
          <select
            className={styles.pageSizeSelect}
            value={pageSize}
            onChange={(e) => onPageSizeChange && onPageSizeChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className={styles.paginationControls}>
        <button
          type="button"
          className={styles.pageBtn}
          onClick={() => onPageChange && onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
        >
          Anterior
        </button>
        <span className={styles.pageIndicator}>
          Página {safePage} de {totalPages}
        </span>
        <button
          type="button"
          className={styles.pageBtn}
          onClick={() => onPageChange && onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default ProfitabilityTablePagination;
