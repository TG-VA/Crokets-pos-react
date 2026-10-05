import React, { useEffect } from "react";

import PaginationBar from "../../../../PaginationBar/PaginationBar";

import { usePagination } from "../../../../../hooks/usePagination";

import { getKardexRangeLabel } from "../utils/kardexFormatters";

import KardexProductSummary from "./KardexProductSummary";
import KardexTable from "./KardexTable";

import styles from "./KardexProductPanel.module.css";

const KARDEX_PAGE_SIZE_OPTIONS = [10, 25, 50];

const getKardexProductKey = (product) =>
  String(product?.id ?? product?.product_id ?? "");

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
  const normalizedRows = Array.isArray(rows) ? rows : [];

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
    totalItems: normalizedRows.length,
    defaultPageSize: KARDEX_PAGE_SIZE_OPTIONS[0],
    pageSizeOptions: KARDEX_PAGE_SIZE_OPTIONS,
  });

  const productKey = getKardexProductKey(product);

  // Cambiar de producto o de rango de fechas reinicia la pagina para que el
  // panel no abra en una pagina vacia o fuera del nuevo conjunto de datos.
  useEffect(() => {
    resetPagination();
  }, [productKey, appliedDateFrom, appliedDateTo, resetPagination]);

  if (!product) {
    return null;
  }

  const loading = Boolean(movementState?.loading);

  const error = String(movementState?.error ?? "");

  const hasActiveRange = Boolean(appliedDateFrom || appliedDateTo);

  const rangeLabel = getKardexRangeLabel({
    dateFrom: appliedDateFrom,
    dateTo: appliedDateTo,
  });

  const canExport = normalizedRows.length > 0 && !loading && !error;

  const paginatedRows = pageItems(normalizedRows);

  return (
    <div className={styles.panel}>
      <KardexProductSummary
        product={product}
        slot={slot}
        showAddProduct={showAddProduct}
        exporting={exporting}
        canExport={canExport}
        onChangeProduct={onChangeProduct}
        onAddProduct={onAddProduct}
        onRemoveProduct={onRemoveProduct}
        onExport={onExport}
      />

      <div className={styles.movementsSection}>
        <div className={styles.movementsHeader}>
          <div>
            <h2 className={styles.movementsTitle}>Movimientos del producto</h2>

            {hasActiveRange ? (
              <div className={styles.rangeActive}>
                Rango activo: {rangeLabel}
              </div>
            ) : (
              <div className={styles.rangeLabel}>Todas las fechas</div>
            )}
          </div>

          <span className={styles.movementsCount}>
            {normalizedRows.length} movimiento(s)
          </span>
        </div>

        <KardexTable
          rows={paginatedRows}
          product={product}
          loading={loading}
          error={error}
        />

        {normalizedRows.length > 0 && (
          <div className={styles.paginationFooter}>
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={normalizedRows.length}
              pageSize={pageSize}
              pageSizeOptions={KARDEX_PAGE_SIZE_OPTIONS}
              startIndex={startIndex}
              endIndex={endIndex}
              itemsNoun="movimientos"
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default KardexProductPanel;
