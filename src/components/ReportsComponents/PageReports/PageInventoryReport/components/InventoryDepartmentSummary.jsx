import React, { useState, useMemo, useEffect } from "react";
import styles from "./InventoryComponents.module.css";
import { formatCurrency } from "../../../../../utils/formatters";

const InventoryDepartmentSummary = ({ departmentData = [], isLoading = false }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(departmentData.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Resetear a página 1 cuando la cantidad de departamentos cambie
  useEffect(() => {
    setCurrentPage(1);
  }, [departmentData.length]);

  const currentDepts = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return departmentData.slice(startIndex, startIndex + pageSize);
  }, [departmentData, safeCurrentPage, pageSize]);

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
              Mostrando {Math.min((safeCurrentPage - 1) * pageSize + 1, departmentData.length)} a{" "}
              {Math.min(safeCurrentPage * pageSize, departmentData.length)} de {departmentData.length} departamentos
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

export default InventoryDepartmentSummary;
