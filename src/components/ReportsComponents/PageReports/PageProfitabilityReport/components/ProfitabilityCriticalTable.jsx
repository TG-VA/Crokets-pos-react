/**
 * ProfitabilityCriticalTable.jsx
 * Tabla enfocada en productos con margen crítico (< 15%) o venta a pérdida (<= 0%),
 * con ordenamiento interactivo OCP, banner de auditoría y fila de totales.
 */

import React, { useState, useMemo } from "react";
import styles from "./ProfitabilityComponents.module.css";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "../utils/profitabilityReportFormatters";
import KitComponentsDetailModal from "./KitComponentsDetailModal";
import CriticalAuditBanner from "./CriticalAuditBanner";
import ProfitabilityTablePagination from "./ProfitabilityTablePagination";
import ProfitabilityCriticalRow from "./ProfitabilityCriticalRow";
import { usePagination } from "../../../../../hooks/usePagination";

import warningIcon from "../../../../../assets/icons/triangle-exclamation-solid-full.svg";

const CRITICAL_COLUMNS = [
  { key: "barcode", label: "Código", colClass: "colBarcode", align: "left", getVal: (p) => p.barcode || "" },
  { key: "product", label: "Producto", colClass: "colProduct", align: "left", getVal: (p) => (p.productName || "").toLowerCase() },
  { key: "department", label: "Departamento", colClass: "colDepartment", align: "left", getVal: (p) => (p.departmentName || "").toLowerCase() },
  { key: "units", label: "Unidades", colClass: "colUnits", align: "center", getVal: (p) => p.totalUnits || 0 },
  { key: "price", label: "Precio Promedio", colClass: "colPrice", align: "right", getVal: (p) => p.averageSalePrice || 0 },
  { key: "cost", label: "Costo Unit.", colClass: "colCost", align: "right", getVal: (p) => p.averageCostPrice || 0 },
  { key: "revenue", label: "Ingreso Total", colClass: "colRevenue", align: "right", getVal: (p) => p.totalRevenue || 0 },
  { key: "totalCost", label: "Costo Total", colClass: "colTotalCost", align: "right", getVal: (p) => p.totalCost || 0 },
  { key: "profit", label: "Utilidad Bruta", colClass: "colProfit", align: "right", getVal: (p) => p.grossProfit || 0 },
  { key: "margin", label: "Margen", colClass: "colMargin", align: "center", getVal: (p) => p.grossMarginPercent || 0 },
];

const ProfitabilityCriticalTable = ({ criticalProducts = [] }) => {
  const [selectedKitProduct, setSelectedKitProduct] = useState(null);
  const [sortBy, setSortBy] = useState("margin");
  const [sortDirection, setSortDirection] = useState("asc");
  const [filterCause, setFilterCause] = useState("all");

  const counts = useMemo(() => {
    let pricing = 0;
    let rewards = 0;
    criticalProducts.forEach((p) => {
      if (p.isPureReward || p.hasPartialReward) {
        rewards++;
      } else {
        pricing++;
      }
    });
    return { all: criticalProducts.length, pricing, rewards };
  }, [criticalProducts]);

  const filteredProducts = useMemo(() => {
    if (filterCause === "pricing") {
      return criticalProducts.filter((p) => !p.isPureReward && !p.hasPartialReward);
    }
    if (filterCause === "rewards") {
      return criticalProducts.filter((p) => p.isPureReward || p.hasPartialReward);
    }
    return criticalProducts;
  }, [criticalProducts, filterCause]);

  const {
    currentPage,
    pageSize,
    pageItems,
    resetPagination,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination({
    totalItems: filteredProducts.length,
    defaultPageSize: 10,
  });

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDirection("asc");
    }
    resetPagination();
  };

  const sortedProducts = useMemo(() => {
    const colDef = CRITICAL_COLUMNS.find((c) => c.key === sortBy);
    const getter = colDef?.getVal || ((p) => p.grossMarginPercent || 0);
    const isAsc = sortDirection === "asc";
    return [...filteredProducts].sort((a, b) => {
      const valA = getter(a);
      const valB = getter(b);
      if (typeof valA === "string") {
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return isAsc ? valA - valB : valB - valA;
    });
  }, [filteredProducts, sortBy, sortDirection]);

  const totals = useMemo(() => {
    return filteredProducts.reduce(
      (acc, p) => {
        acc.units += p.totalUnits || 0;
        acc.revenue += p.totalRevenue || 0;
        acc.cost += p.totalCost || 0;
        acc.profit += p.grossProfit || 0;
        return acc;
      },
      { units: 0, revenue: 0, cost: 0, profit: 0 }
    );
  }, [filteredProducts]);

  const totalWeightedMargin =
    totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

  const totalItems = sortedProducts.length;
  const paginatedData = pageItems(sortedProducts);

  const renderSortIndicator = (key) => (
    <span className={styles.sortIndicator}>
      {sortBy === key ? (sortDirection === "desc" ? "↓" : "↑") : ""}
    </span>
  );

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableHeaderBar}>
        <div className={styles.tableTitleGroup}>
          <h3 className={styles.tableTitle}>
            Productos con Margen Crítico o Pérdida
          </h3>
          <p className={styles.tableSubtitle}>
            Mostrando {sortedProducts.length}{" "}
            {sortedProducts.length === 1 ? "artículo" : "artículos"}
            {filterCause === "pricing"
              ? " con necesidad de revisión de precios"
              : filterCause === "rewards"
              ? " con bonificación comercial o regalo"
              : " con rentabilidad inferior al 15% o costo no cubierto"}
          </p>
        </div>

        <div className={styles.causeFilterGroup}>
          <button
            type="button"
            className={`${styles.causeFilterBtn} ${
              filterCause === "all" ? styles.causeFilterBtnActive : ""
            }`.trim()}
            onClick={() => {
              setFilterCause("all");
              resetPagination();
            }}
          >
            Todos ({counts.all})
          </button>
          <button
            type="button"
            className={`${styles.causeFilterBtn} ${
              filterCause === "pricing" ? styles.causeFilterBtnActive : ""
            }`.trim()}
            onClick={() => {
              setFilterCause("pricing");
              resetPagination();
            }}
          >
            Revisar Precios ({counts.pricing})
          </button>
          <button
            type="button"
            className={`${styles.causeFilterBtn} ${
              filterCause === "rewards" ? styles.causeFilterBtnActive : ""
            }`.trim()}
            onClick={() => {
              setFilterCause("rewards");
              resetPagination();
            }}
          >
            Promociones y Regalos ({counts.rewards})
          </button>
        </div>
      </div>

      <CriticalAuditBanner />

      {criticalProducts.length === 0 ? (
        <div className={styles.emptyContainer}>
          <div className={styles.emptyIconWrapper}>
            <img src={warningIcon} alt="" />
          </div>
          <h4 className={styles.emptyTitle}>
            Excelente: Sin productos en margen crítico
          </h4>
          <p className={styles.emptyDescription}>
            Todos los artículos vendidos en el periodo seleccionado mantienen un margen de ganancia saludable (&gt;= 15%).
          </p>
        </div>
      ) : totalItems === 0 ? (
        <div className={styles.emptyContainer}>
          <div className={styles.emptyIconWrapper}>
            <img src={warningIcon} alt="" />
          </div>
          <h4 className={styles.emptyTitle}>
            Sin productos en este filtro
          </h4>
          <p className={styles.emptyDescription}>
            No hay artículos que coincidan con el criterio seleccionado. Puedes volver a ver todos los artículos críticos.
          </p>
          <button
            type="button"
            className={`${styles.causeFilterBtn} ${styles.causeFilterBtnActive}`.trim()}
            onClick={() => {
              setFilterCause("all");
              resetPagination();
            }}
          >
            Mostrar Todos ({counts.all})
          </button>
        </div>
      ) : (
        <>
          <div className={styles.tableResponsive}>
            <table className={styles.dataTable}>
              <colgroup>
                {CRITICAL_COLUMNS.map((col) => (
                  <col key={col.key} className={styles[col.colClass]} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {CRITICAL_COLUMNS.map((col) => {
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
                {paginatedData.map((p) => (
                  <ProfitabilityCriticalRow
                    key={p.productId}
                    product={p}
                    onSelectKit={setSelectedKitProduct}
                  />
                ))}
              </tbody>
              <tfoot className={styles.tableFooterTotal}>
                <tr>
                  <td colSpan={3}>
                    <span className={styles.totalRowLabel}>
                      Total {filterCause === "pricing" ? "Revisar Precios" : filterCause === "rewards" ? "Promociones" : "Críticos"} ({sortedProducts.length}{" "}
                      {sortedProducts.length === 1 ? "artículo" : "artículos"})
                    </span>
                  </td>
                  <td className={styles.alignCenter}>
                    <span className={styles.boldValue}>
                      {formatNumber(totals.units)}
                    </span>
                  </td>
                  <td className={styles.alignRight}>-</td>
                  <td className={styles.alignRight}>-</td>
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
                    <span
                      className={
                        totals.profit < 0 ? styles.lossValue : styles.profitValue
                      }
                    >
                      {formatCurrency(totals.profit)}
                    </span>
                  </td>
                  <td className={styles.alignCenter}>
                    <span className={styles.totalMarginBadge}>
                      {formatPercent(totalWeightedMargin)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <ProfitabilityTablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />

          <KitComponentsDetailModal
            isOpen={Boolean(selectedKitProduct)}
            onClose={() => setSelectedKitProduct(null)}
            kitProduct={selectedKitProduct}
          />
        </>
      )}
    </div>
  );
};

export default ProfitabilityCriticalTable;
