/**
 * ProfitabilityProductsTable.jsx
 * Tabla interactiva de rentabilidad por producto con ordenamiento y paginación.
 */

import React, { useState } from "react";
import styles from "./ProfitabilityComponents.module.css";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "../utils/profitabilityReportFormatters";
import KitComponentsDetailModal from "./KitComponentsDetailModal";
import ProfitabilityTablePagination from "./ProfitabilityTablePagination";
import { usePagination } from "../../../../../hooks/usePagination";

import boxIcon from "../../../../../assets/icons/box-solid-full.svg";

const ProfitabilityProductsTable = ({
  products = [],
  sortBy = "profit",
  sortDirection = "desc",
  onSort,
}) => {
  const [selectedKitProduct, setSelectedKitProduct] = useState(null);

  const {
    currentPage,
    pageSize,
    pageItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination({
    totalItems: products.length,
    defaultPageSize: 10,
  });

  const totalItems = products.length;
  const paginatedData = pageItems(products);

  const renderSortIndicator = (key) => {
    return (
      <span className={styles.sortIndicator}>
        {sortBy === key ? (sortDirection === "desc" ? "↓" : "↑") : ""}
      </span>
    );
  };

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableHeaderBar}>
        <div className={styles.tableTitleGroup}>
          <h3 className={styles.tableTitle}>Rentabilidad por Producto</h3>
          <p className={styles.tableSubtitle}>
            Mostrando {products.length} artículos vendidos según los filtros seleccionados
          </p>
        </div>
      </div>

      {totalItems === 0 ? (
        <div className={styles.emptyContainer}>
          <div className={styles.emptyIconWrapper}>
            <img src={boxIcon} alt="" />
          </div>
          <h4 className={styles.emptyTitle}>Sin ventas en el periodo</h4>
          <p className={styles.emptyDescription}>
            No se encontraron transacciones registradas de productos con los filtros y fechas seleccionadas.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.tableResponsive}>
            <table className={styles.dataTable}>
              <colgroup>
                <col className={styles.colBarcode} />
                <col className={styles.colProduct} />
                <col className={styles.colDepartment} />
                <col className={styles.colUnits} />
                <col className={styles.colPrice} />
                <col className={styles.colCost} />
                <col className={styles.colRevenue} />
                <col className={styles.colTotalCost} />
                <col className={styles.colProfit} />
                <col className={styles.colMargin} />
              </colgroup>
              <thead>
                <tr>
                  <th className={styles.colBarcode}>Código</th>
                  <th
                    className={`${styles.colProduct} ${styles.sortableTh}`.trim()}
                    onClick={() => onSort && onSort("name")}
                  >
                    <span className={styles.thContent}>
                      Producto {renderSortIndicator("name")}
                    </span>
                  </th>
                  <th className={styles.colDepartment}>Departamento</th>
                  <th
                    className={`${styles.colUnits} ${styles.alignCenter} ${styles.sortableTh}`.trim()}
                    onClick={() => onSort && onSort("units")}
                  >
                    <span className={styles.thContentCenter}>
                      Unidades {renderSortIndicator("units")}
                    </span>
                  </th>
                  <th className={`${styles.colPrice} ${styles.alignRight}`.trim()}>Precio Promedio</th>
                  <th className={`${styles.colCost} ${styles.alignRight}`.trim()}>Costo Unit.</th>
                  <th
                    className={`${styles.colRevenue} ${styles.alignRight} ${styles.sortableTh}`.trim()}
                    onClick={() => onSort && onSort("revenue")}
                  >
                    <span className={styles.thContentRight}>
                      Ingreso Total {renderSortIndicator("revenue")}
                    </span>
                  </th>
                  <th
                    className={`${styles.colTotalCost} ${styles.alignRight} ${styles.sortableTh}`.trim()}
                    onClick={() => onSort && onSort("cost")}
                  >
                    <span className={styles.thContentRight}>
                      Costo Total {renderSortIndicator("cost")}
                    </span>
                  </th>
                  <th
                    className={`${styles.colProfit} ${styles.alignRight} ${styles.sortableTh}`.trim()}
                    onClick={() => onSort && onSort("profit")}
                  >
                    <span className={styles.thContentRight}>
                      Utilidad Bruta {renderSortIndicator("profit")}
                    </span>
                  </th>
                  <th
                    className={`${styles.colMargin} ${styles.alignCenter} ${styles.sortableTh}`.trim()}
                    onClick={() => onSort && onSort("margin")}
                  >
                    <span className={styles.thContentCenter}>
                      Margen {renderSortIndicator("margin")}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((p) => {
                  const mClass = p.marginClassification || {};
                  return (
                    <tr key={p.productId}>
                      <td className={styles.monospaceCell}>
                        {p.barcode || "S/C"}
                      </td>
                      <td>
                        <div className={styles.productCell}>
                          <span className={styles.productNameText}>
                            {p.productName}
                          </span>
                          {p.isPureReward ? (
                            <span className={styles.rewardBadge}>
                              Promoción / Regalo ($0.00)
                            </span>
                          ) : p.hasPartialReward ? (
                            <span className={styles.rewardSubtext}>
                              Incluye {p.redeemedUnits} {p.redeemedUnits === 1 ? "unidad en promoción / regalo" : "unidades en promoción / regalo"} ($0.00)
                            </span>
                          ) : p.isKit ? (
                            <button
                              type="button"
                              className={styles.kitMetaBadgeButton}
                              onClick={() => setSelectedKitProduct(p)}
                              title="Clic para ver desglose de componentes y costos de este kit"
                            >
                              Kit ({p.kitComponentsCount || 0} prod.) · Costo por componentes
                            </button>
                          ) : !p.hasCostAssigned ? (
                            <span className={styles.productMeta}>
                              Sin costo base asignado ($0.00)
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span className={styles.badgeDepartment}>
                          {p.departmentName || "General"}
                        </span>
                      </td>
                      <td className={styles.alignCenter}>
                        <span className={styles.boldValue}>
                          {formatNumber(p.totalUnits)}
                        </span>
                      </td>
                      <td className={styles.alignRight}>
                        {formatCurrency(p.averageSalePrice)}
                      </td>
                      <td className={styles.alignRight}>
                        {formatCurrency(p.averageCostPrice)}
                      </td>
                      <td className={styles.alignRight}>
                        <span className={styles.boldValue}>
                          {formatCurrency(p.totalRevenue)}
                        </span>
                      </td>
                      <td className={styles.alignRight}>
                        {formatCurrency(p.totalCost)}
                      </td>
                      <td className={styles.alignRight}>
                        <span
                          className={
                            p.grossProfit > 0
                              ? styles.profitValue
                              : p.grossProfit < 0
                              ? styles.lossValue
                              : styles.boldValue
                          }
                          title={
                            p.isPureReward
                              ? "Costo 100% absorbido por promoción comercial o regalo ($0.00 ingreso)"
                              : p.hasPartialReward
                              ? `Incluye ${p.redeemedUnits} ${p.redeemedUnits === 1 ? "unidad entregada en promoción / regalo" : "unidades entregadas en promoción / regalo"} ($0.00 ingreso)`
                              : ""
                          }
                        >
                          {formatCurrency(p.grossProfit)}
                        </span>
                      </td>
                      <td className={styles.alignCenter}>
                        <span
                          className={`${styles.marginBadge} ${
                            styles[mClass.statusClass] || ""
                          }`.trim()}
                          title={
                            p.isPureReward
                              ? "100% bonificado en promoción o cortesía comercial ($0.00 ingreso)"
                              : p.hasPartialReward
                              ? `Margen contable afectado por ${p.redeemedUnits} ${p.redeemedUnits === 1 ? "unidad entregada en promoción / regalo" : "unidades entregadas en promoción / regalo"}.`
                              : mClass.label
                          }
                        >
                          {mClass.badgeText || formatPercent(p.grossMarginPercent)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
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

export default ProfitabilityProductsTable;
