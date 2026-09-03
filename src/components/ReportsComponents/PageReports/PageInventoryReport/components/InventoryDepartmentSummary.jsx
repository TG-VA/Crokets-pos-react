import React from "react";
import styles from "./InventoryComponents.module.css";
import { formatCurrency } from "../../../../../utils/formatters";

const InventoryDepartmentSummary = ({ departmentData = [], isLoading = false }) => {
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
            {departmentData.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  No hay datos por departamento disponibles.
                </td>
              </tr>
            ) : (
              departmentData.map((dept) => (
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
    </div>
  );
};

export default InventoryDepartmentSummary;
