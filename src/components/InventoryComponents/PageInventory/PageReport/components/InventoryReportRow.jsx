import React from "react";
import styles from "./InventoryReportRows.module.css";

import {
  getStockStatus,
  toUpperSafe,
} from "../utils/inventoryReportUtils";

import InventoryDetailRow from "./InventoryDetailRow";

const InventoryReportRow = ({
  row,
  isExpanded = false,
  detailRows = [],
  detailsLoading = false,
  detailsError = "",
  onToggleOtherStocks,
}) => {
  const stockStatus = getStockStatus(row);

  const rowClassName =
    stockStatus.type === "outOfStock"
      ? styles.outOfStockRow
      : stockStatus.type === "lowStock"
        ? styles.lowStockRow
        : stockStatus.type === "notApplicable"
          ? styles.notApplicableRow
          : "";

  const hasInventory =
    row?.tracksInventory !== false;

  const existenceValue =
    row?.existencia === null ||
    row?.existencia === undefined
      ? "—"
      : row.existencia;

  const minimumValue =
    row?.min === null || row?.min === undefined
      ? "—"
      : row.min;

  const maximumValue =
    row?.max === null || row?.max === undefined
      ? "—"
      : row.max;

  return (
    <>
      <tr className={rowClassName}>
        <td className={styles.codeCell}>
          {row?.codigo || "—"}
        </td>

        <td className={styles.nameCell}>
          {toUpperSafe(row?.nombre)}
        </td>

        <td>{toUpperSafe(row?.depto)}</td>

        <td>
          <div
            className={`${styles.stockCell} ${
              styles[stockStatus.type]
            }`}
          >
            <span className={styles.stockValue}>
              {existenceValue}
            </span>

            <span className={styles.stockBadge}>
              {stockStatus.label}
            </span>
          </div>
        </td>

        <td>{minimumValue}</td>

        <td>{maximumValue}</td>

        <td>
          {!hasInventory ? (
            <span className={styles.notApplicableText}>
              No aplica
            </span>
          ) : (
            <button
              type="button"
              className={styles.linkButton}
              onClick={() =>
                onToggleOtherStocks?.(row.productId)
              }
              title={
                isExpanded
                  ? "Ocultar existencias de otras sucursales"
                  : "Consultar existencias de este producto en otras sucursales"
              }
              aria-expanded={isExpanded}
            >
              {isExpanded
                ? "Ocultar otras sucursales"
                : "Ver otras sucursales"}
            </button>
          )}
        </td>
      </tr>

      {isExpanded && hasInventory && (
        <InventoryDetailRow
          detailRows={detailRows}
          loading={detailsLoading}
          error={detailsError}
        />
      )}
    </>
  );
};

export default InventoryReportRow;