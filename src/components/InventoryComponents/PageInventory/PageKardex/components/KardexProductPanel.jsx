import React from "react";

import {
  getKardexRangeLabel,
} from "../utils/kardexFormatters";

import KardexProductSummary from "./KardexProductSummary";
import KardexTable from "./KardexTable";

import styles from "./KardexProductPanel.module.css";

const KardexProductPanel = ({
  slot = 0,
  product = null,
  rows = [],
  movementState = null,

  appliedDateFrom = "",
  appliedDateTo = "",

  showAddProduct = false,
  exporting = false,

  onChangeProduct,
  onAddProduct,
  onRemoveProduct,
  onExport,
}) => {
  if (!product) {
    return null;
  }

  const normalizedRows =
    Array.isArray(rows)
      ? rows
      : [];

  const loading = Boolean(
    movementState?.loading
  );

  const error = String(
    movementState?.error ?? ""
  );

  const hasActiveRange = Boolean(
    appliedDateFrom ||
    appliedDateTo
  );

  const rangeLabel =
    getKardexRangeLabel({
      dateFrom: appliedDateFrom,
      dateTo: appliedDateTo,
    });

  const canExport =
    normalizedRows.length > 0 &&
    !loading &&
    !error;

  return (
    <div className={styles.panel}>
      <KardexProductSummary
        product={product}
        slot={slot}
        showAddProduct={
          showAddProduct
        }
        exporting={exporting}
        canExport={canExport}
        onChangeProduct={
          onChangeProduct
        }
        onAddProduct={
          onAddProduct
        }
        onRemoveProduct={
          onRemoveProduct
        }
        onExport={onExport}
      />

      <div className={styles.movementsSection}>
        <div className={styles.movementsHeader}>
          <div>
            <h2 className={styles.movementsTitle}>
              Movimientos del producto
            </h2>

            {hasActiveRange ? (
              <div className={styles.rangeActive}>
                Rango activo: {rangeLabel}
              </div>
            ) : (
              <div className={styles.rangeLabel}>
                Todas las fechas
              </div>
            )}
          </div>

          <span className={styles.movementsCount}>
            {normalizedRows.length}{" "}
            movimiento(s)
          </span>
        </div>

        <KardexTable
          rows={normalizedRows}
          product={product}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
};

export default KardexProductPanel;  