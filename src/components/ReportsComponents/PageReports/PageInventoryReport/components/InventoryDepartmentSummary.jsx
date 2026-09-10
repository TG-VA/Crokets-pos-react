import React, { useMemo, useEffect } from "react";
import styles from "./InventoryComponents.module.css";
import { formatCurrency } from "../../../../../utils/formatters";
import { usePagination } from "../../../../../hooks/usePagination";
import PaginationBar from "../../../../../components/PaginationBar/PaginationBar";

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

  const currentDepts = pageItems(departmentData);

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
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={departmentData.length}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50]}
          startIndex={startIndex}
          endIndex={endIndex}
          itemsNoun="departamentos"
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
};

export default InventoryDepartmentSummary;
