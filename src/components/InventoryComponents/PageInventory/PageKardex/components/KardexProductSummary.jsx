import React from "react";

import {
  formatKardexCurrency,
} from "../utils/kardexFormatters";

import {
  getKardexMaximumStock,
  getKardexMinimumStock,
  getKardexProductStock,
  getKardexStockStatus,
  productTracksInventory,
} from "../utils/kardexMovementUtils";

import styles from "./KardexProductSummary.module.css";

const STOCK_STATUS_CLASS_NAMES = {
  outOfStock: styles.statAgotado,
  lowStock: styles.statPorAgotarse,
  available: styles.statDisponible,
  overstock: styles.statSobrestock,
  noInventory: styles.statSinInventario,
};

const getProductName = (product) => {
  return (
    product?.descripcion ??
    product?.name ??
    "—"
  );
};

const getProductBarcode = (product) => {
  return (
    product?.codigo ??
    product?.barcode ??
    "SIN CÓDIGO"
  );
};

const getProductDepartment = (product) => {
  return (
    product?.departamento ??
    product?.department_name ??
    product?.departments?.name ??
    "—"
  );
};

const getProductPrice = (product) => {
  return (
    product?.precio ??
    product?.sale_price ??
    product?.price ??
    0
  );
};

const KardexProductSummary = ({
  product,
  slot = 0,
  showAddProduct = false,
  exporting = false,
  canExport = false,

  onChangeProduct,
  onAddProduct,
  onRemoveProduct,
  onExport,
}) => {
  if (!product) {
    return null;
  }

  const tracksInventory =
    productTracksInventory(product);

  const currentStock =
    getKardexProductStock(product);

  const minimumStock =
    getKardexMinimumStock(product);

  const maximumStock =
    getKardexMaximumStock(product);

  const stockStatus =
    getKardexStockStatus({
      currentStock,
      minimumStock,
      maximumStock,
      tracksInventory,
    });

  const statusClassName =
    STOCK_STATUS_CLASS_NAMES[
      stockStatus.key
    ] ?? "";

  const exportDisabled =
    exporting || !canExport;

  return (
    <div className={styles.productCard}>
      <div className={styles.productMain}>
        <div className={styles.productName}>
          {getProductName(product)}
        </div>

        <div className={styles.productMeta}>
          <span className={styles.metaBadge}>
            CÓDIGO:{" "}
            {getProductBarcode(product)}
          </span>

          <span className={styles.metaBadge}>
            DPTO:{" "}
            {getProductDepartment(product)}
          </span>
        </div>
      </div>

      <div className={styles.inventoryStats}>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>
            Existencia actual
          </div>

          <div className={styles.statValue}>
            {tracksInventory
              ? currentStock
              : "—"}
          </div>
        </div>

        <div className={styles.statBox}>
          <div className={styles.statLabel}>
            Mínimo
          </div>

          <div className={styles.statValue}>
            {tracksInventory
              ? minimumStock
              : "—"}
          </div>
        </div>

        <div className={styles.statBox}>
          <div className={styles.statLabel}>
            Máximo
          </div>

          <div className={styles.statValue}>
            {tracksInventory
              ? maximumStock
              : "—"}
          </div>
        </div>

        <div
          className={`${styles.statBox} ${statusClassName}`}
        >
          <div className={styles.statLabel}>
            Estado
          </div>

          <div className={styles.statValue}>
            {stockStatus.label}
          </div>
        </div>

        <div className={styles.statBox}>
          <div className={styles.statLabel}>
            Precio venta
          </div>

          <div className={styles.statValue}>
            {formatKardexCurrency(
              getProductPrice(product)
            )}
          </div>
        </div>
      </div>

      <div className={styles.productActions}>
        <button
          type="button"
          className={styles.changeButton}
          onClick={() => {
            onChangeProduct?.(slot);
          }}
          disabled={exporting}
        >
          Cambiar producto
        </button>

        {showAddProduct ? (
          <button
            type="button"
            className={styles.changeButton}
            onClick={() => {
              onAddProduct?.();
            }}
            disabled={exporting}
          >
            Agregar producto
          </button>
        ) : null}

        <button
          type="button"
          className={styles.removeButton}
          onClick={() => {
            onRemoveProduct?.(slot);
          }}
          disabled={exporting}
        >
          Quitar
        </button>

        <button
          type="button"
          className={styles.exportButton}
          onClick={() => {
            onExport?.(slot);
          }}
          disabled={exportDisabled}
          title={
            !canExport
              ? "No hay movimientos para exportar."
              : undefined
          }
        >
          {exporting
            ? "Exportando..."
            : "Exportar"}
        </button>
      </div>
    </div>
  );
};

export default KardexProductSummary;