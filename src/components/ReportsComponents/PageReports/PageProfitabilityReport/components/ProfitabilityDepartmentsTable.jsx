/**
 * ProfitabilityDepartmentsTable.jsx
 * Tabla interactiva de rentabilidad por departamento con ordenamiento OCP,
 * barra de contribución, drill-down y fila de totales contables.
 */

import React, { useState, useMemo } from "react";
import styles from "./ProfitabilityComponents.module.css";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "../utils/profitabilityReportFormatters";
import { usePagination } from "../../../../../hooks/usePagination";
import PaginationBar from "../../../../../components/PaginationBar/PaginationBar";

import tagIcon from "../../../../../assets/icons/tag-solid-full.svg";

const DEPT_COLUMNS = [
  { key: "name", label: "Departamento", colClass: "colDeptName", align: "left" },
  { key: "variety", label: "Variedad Prod.", colClass: "colDeptVariedad", align: "center" },
  { key: "units", label: "Unidades", colClass: "colDeptUnits", align: "center" },
  { key: "revenue", label: "Ingreso Total", colClass: "colDeptRevenue", align: "right" },
  { key: "cost", label: "Costo Total", colClass: "colDeptCost", align: "right" },
  { key: "profit", label: "Utilidad Bruta", colClass: "colDeptProfit", align: "right" },
  { key: "margin", label: "Margen", colClass: "colDeptMargin", align: "center" },
  { key: "contribution", label: "% Contribución", colClass: "colDeptContrib", align: "center" },
];

const SORT_GETTERS = {
  name: (d) => (d.departmentName || "").toLowerCase(),
  variety: (d) => d.productsCount || 0,
  units: (d) => d.totalUnits || 0,
  revenue: (d) => d.totalRevenue || 0,
  cost: (d) => d.totalCost || 0,
  profit: (d) => d.grossProfit || 0,
  margin: (d) => d.grossMarginPercent || 0,
  contribution: (d) => d.contributionPercent || 0,
};

const ProfitabilityDepartmentsTable = ({ departments = [] }) => {
  const [sortBy, setSortBy] = useState("profit");
  const [sortDirection, setSortDirection] = useState("desc");

  const sortedDepartments = useMemo(() => {
    const getter = SORT_GETTERS[sortBy] || SORT_GETTERS.profit;
    const isAsc = sortDirection === "asc";
    return [...departments].sort((a, b) => {
      const valA = getter(a);
      const valB = getter(b);
      if (typeof valA === "string") {
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return isAsc ? valA - valB : valB - valA;
    });
  }, [departments, sortBy, sortDirection]);

  const totals = useMemo(() => {
    return departments.reduce(
      (acc, d) => {
        acc.variety += d.productsCount || 0;
        acc.units += d.totalUnits || 0;
        acc.revenue += d.totalRevenue || 0;
        acc.cost += d.totalCost || 0;
        acc.profit += d.grossProfit || 0;
        return acc;
      },
      { variety: 0, units: 0, revenue: 0, cost: 0, profit: 0 }
    );
  }, [departments]);

  const totalWeightedMargin =
    totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

  const {
    currentPage,
    totalPages,
    pageSize,
    startIndex: pageStart,
    endIndex: pageEnd,
    pageItems,
    resetPagination,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination({
    totalItems: sortedDepartments.length,
    defaultPageSize: 10,
    pageSizeOptions: [5, 10, 20],
  });

  const totalItems = sortedDepartments.length;
  const paginatedData = pageItems(sortedDepartments);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDirection("desc");
    }
    resetPagination();
  };

  const renderSortIndicator = (key) => (
    <span className={styles.sortIndicator}>
      {sortBy === key ? (sortDirection === "desc" ? "↓" : "↑") : ""}
    </span>
  );

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableHeaderBar}>
        <div className={styles.tableTitleGroup}>
          <h3 className={styles.tableTitle}>Rentabilidad por Departamento</h3>
          <p className={styles.tableSubtitle}>
            Consolidado financiero por categoría de productos en el periodo
          </p>
        </div>
      </div>

      {totalItems === 0 ? (
        <div className={styles.emptyContainer}>
          <div className={styles.emptyIconWrapper}>
            <img src={tagIcon} alt="" />
          </div>
          <h4 className={styles.emptyTitle}>Sin departamentos registrados</h4>
          <p className={styles.emptyDescription}>
            No se encontraron ventas asociadas a departamentos en el rango seleccionado.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.tableDepartmentsWrapper}>
            <table className={styles.dataTableDepartments}>
              <colgroup>
                {DEPT_COLUMNS.map((col) => (
                  <col key={col.key} className={styles[col.colClass]} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {DEPT_COLUMNS.map((col) => {
                    const alignClass =
                      col.align === "center"
                        ? styles.alignCenter
                        : col.align === "right"
                        ? styles.alignRight
                        : "";
                    const contentClass =
                      col.align === "center"
                        ? styles.thContentCenter
                        : col.align === "right"
                        ? styles.thContentRight
                        : styles.thContent;

                    return (
                      <th
                        key={col.key}
                        className={`${styles[col.colClass]} ${styles.sortableTh} ${alignClass}`.trim()}
                        onClick={() => handleSort(col.key)}
                      >
                        <span className={contentClass}>
                          {col.label}
                          {renderSortIndicator(col.key)}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((d) => {
                  const mClass = d.marginClassification || {};
                  return (
                    <tr key={d.departmentId}>
                      <td>
                        <span className={styles.boldValue}>
                          {d.departmentName}
                        </span>
                      </td>
                      <td className={styles.alignCenter}>
                        <span>{d.productsCount} art.</span>
                      </td>
                      <td className={styles.alignCenter}>
                        <span className={styles.boldValue}>
                          {formatNumber(d.totalUnits)}
                        </span>
                      </td>
                      <td className={styles.alignRight}>
                        <span className={styles.boldValue}>
                          {formatCurrency(d.totalRevenue)}
                        </span>
                      </td>
                      <td className={styles.alignRight}>
                        {formatCurrency(d.totalCost)}
                      </td>
                      <td className={styles.alignRight}>
                        <span
                          className={
                            d.grossProfit > 0
                              ? styles.profitValue
                              : d.grossProfit < 0
                              ? styles.lossValue
                              : styles.boldValue
                          }
                        >
                          {formatCurrency(d.grossProfit)}
                        </span>
                      </td>
                      <td className={styles.alignCenter}>
                        <span
                          className={`${styles.marginBadge} ${
                            styles[mClass.statusClass] || ""
                          }`.trim()}
                        >
                          {formatPercent(d.grossMarginPercent)}
                        </span>
                      </td>
                      <td className={styles.alignCenter}>
                        <div className={styles.contribCell}>
                          <span className={styles.boldValue}>
                            {formatPercent(d.contributionPercent)}
                          </span>
                          <div className={styles.contribTrack}>
                            <div
                              className={styles.contribBar}
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, d.contributionPercent || 0)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className={styles.tableFooterTotal}>
                <tr>
                  <td>
                    <span className={styles.totalRowLabel}>
                      Total ({departments.length}{" "}
                      {departments.length === 1 ? "dept." : "depts."})
                    </span>
                  </td>
                  <td className={styles.alignCenter}>
                    <span className={styles.boldValue}>{totals.variety} art.</span>
                  </td>
                  <td className={styles.alignCenter}>
                    <span className={styles.boldValue}>
                      {formatNumber(totals.units)}
                    </span>
                  </td>
                  <td className={styles.alignRight}>
                    <span className={styles.totalValueHighlight}>
                      {formatCurrency(totals.revenue)}
                    </span>
                  </td>
                  <td className={styles.alignRight}>
                    <span className={styles.boldValue}>
                      {formatCurrency(totals.cost)}
                    </span>
                  </td>
                  <td className={styles.alignRight}>
                    <span className={styles.profitValue}>
                      {formatCurrency(totals.profit)}
                    </span>
                  </td>
                  <td className={styles.alignCenter}>
                    <span className={styles.totalMarginBadge}>
                      {formatPercent(totalWeightedMargin)}
                    </span>
                  </td>
                  <td className={styles.alignCenter}>
                    <span className={styles.boldValue}>100.0%</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Paginación */}
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            pageSizeOptions={[5, 10, 20]}
            startIndex={pageStart}
            endIndex={pageEnd}
            itemsNoun="departamentos"
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      )}
    </div>
  );
};

export default ProfitabilityDepartmentsTable;
