import React, { useState, useMemo, useEffect } from "react";
import styles from "./InventoryComponents.module.css";
import { formatCurrency } from "../../../../../utils/formatters";
import { usePagination } from "../../../../../hooks/usePagination";

const InventoryDepartmentSummary = ({ departmentData = [], isLoading = false }) => {
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
    totalItems: departmentData.length,
    defaultPageSize: 10,
    pageSizeOptions: [10, 25, 50],
  });

  // Resetear a página 1 cuando la cantidad de departamentos cambie
  useEffect(() => {
    resetPagination();
  }, [departmentData.length, resetPagination]);

  const currentDepts = useMemo(() => pageItems(departmentData), [
    pageItems,
    departmentData,
  ]);

  if (isLoading) {
    return (
      <div className={styles.tableCard}>
        <div className={styles.emptyState}>Calculando distribución por departamentos...</div>
      </div>
    );
  }

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableHeaderBar}>
        <div>
          <h3 className={styles.tableTitle}>Distribución y Concentración por Departamento</h3>
          <span className={styles.tableSubtitle}>
            Resumen de capital invertido e inventario físico por categoría
          </span>
        </div>
      </div>

      <div className={styles.tableResponsive}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Departamento</th>
              <th className={styles.textRight}>No. Productos</th>
              <th className={styles.textRight}>Total Piezas</th>
              <th className={styles.textRight}>Valor al Costo</th>
              <th className={styles.textRight}>Valor a la Venta</th>
              <th className={styles.textRight}>% del Inventario</th>
            </tr>
          </thead>
          <tbody>
            {currentDepts.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  No hay datos por departamento disponibles.
                </td>
              </tr>
            ) : (
              currentDepts.map((dept) => (
                <tr key={dept.name}>
                  <td className={styles.fontBold}>{dept.name}</td>
                  <td className={styles.textRight}>{dept.productCount.toLocaleString()}</td>
                  <td className={`${styles.textRight} ${styles.fontBold}`}>
                    {dept.totalUnits.toLocaleString()}
                  </td>
                  <td className={`${styles.textRight} ${styles.fontBold}`}>
                    {formatCurrency(dept.totalCost)}
                  </td>
                  <td className={styles.textRight}>{formatCurrency(dept.totalSale)}</td>
                  <td className={`${styles.textRight} ${styles.fontBold}`}>
                    {dept.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {departmentData.length > 0 && (
        <div className={styles.paginationBar}>
          <div className={styles.paginationInfo}>
            <span>
              Mostrando {startIndex + 1} a {endIndex} de {departmentData.length} departamentos
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

export default InventoryDepartmentSummary;
