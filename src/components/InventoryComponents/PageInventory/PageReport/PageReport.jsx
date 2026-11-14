import { useMemo } from "react";
import styles from "./PageReport.module.css";

import InventoryReportTable from "./components/InventoryReportTable";
import PaginationBar from "../../../PaginationBar/PaginationBar";

import useInventoryReport from "./hooks/useInventoryReport";
import useInventoryBranchDetails from "./hooks/useInventoryBranchDetails";
import useInventoryReportFilters from "./hooks/useInventoryReportFilters";
import { usePagination } from "../../../../hooks/usePagination";

import {
  getSelectedBranchLabel,
  getActiveFilterCount,
  filterInventoryRows,
  getStockSummary,
  getStockStatusCounts,
  buildFacetOptions,
} from "./utils/inventoryReportUtils";

import { exportInventoryReport } from "./utils/exportInventoryReport";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

const PageReport = () => {
  const {
    branchOptions,
    selectedBranchId,
    rows,
    loading,
    error,
    handleBranchChange,
  } = useInventoryReport();

  const {
    expandedProductId,
    otherStocksByProduct,
    loadingDetailsByProduct,
    detailsErrorByProduct,
    clearExpandedProduct,
    handleToggleOtherStocks,
  } = useInventoryBranchDetails(selectedBranchId);

  const {
    facetFilters,
    openFacet,
    facetSearch,
    existenceQuantity,
    toggleFacet,
    toggleFacetValue,
    clearFacet,
    clearAllFilters,
    closeFacet,
    handleSearchFacet,
    handleSelectAllFacet,
    handleExistenceQuantityChange,
    applyExistenceQuantityFilter,
    removeExistenceQuantityFilter,
  } = useInventoryReportFilters();

  const handleClearAllFilters = () => {
    clearAllFilters();
    clearExpandedProduct();
  };

  const selectedBranchLabel = useMemo(() => {
    return getSelectedBranchLabel({
      branchOptions,
      selectedBranchId,
    });
  }, [branchOptions, selectedBranchId]);

  const activeFilterCount = useMemo(() => {
    return getActiveFilterCount(facetFilters);
  }, [facetFilters]);

  const filteredRows = useMemo(() => {
    return filterInventoryRows({
      rows,
      facetFilters,
    });
  }, [rows, facetFilters]);

  const {
    currentPage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    pageItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination({
    totalItems: filteredRows.length,
    defaultPageSize: DEFAULT_PAGE_SIZE,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    resetKeys: [selectedBranchId, facetFilters],
  });

  const pageRows = pageItems(filteredRows);

  const stockSummary = useMemo(() => {
    return getStockSummary(rows);
  }, [rows]);

  const stockStatusCounts = useMemo(() => {
    return getStockStatusCounts(rows);
  }, [rows]);

  const facetOptions = useMemo(() => {
    return buildFacetOptions(rows);
  }, [rows]);

  const handleExportInventory = async () => {
    if (loading || filteredRows.length === 0) return;

    try {
      await exportInventoryReport({
        filteredRows,
        facetFilters,
        selectedBranchLabel,
      });
    } catch (exportError) {
      console.error("Error exportando reporte de inventario:", exportError);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.headingBlock}>
            <h1 className={styles.title}>Reporte de inventario</h1>

            <p className={styles.subtitle}>
              Consulta existencias, niveles mínimos y máximos por sucursal.
            </p>
          </div>

          <div className={styles.controls}>
            <div className={styles.controlField}>
              <label className={styles.label}>Sucursal</label>

              <select
                className={styles.select}
                value={selectedBranchId}
                onChange={(event) => handleBranchChange(event.target.value)}
              >
                {branchOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code ? `${item.name} (${item.code})` : item.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className={styles.exportButton}
              onClick={handleExportInventory}
              disabled={loading || filteredRows.length === 0}
              title={
                loading
                  ? "Espera a que termine de cargar el inventario"
                  : filteredRows.length === 0
                    ? "No hay resultados para exportar"
                    : "Exportar los resultados mostrados"
              }
            >
              Exportar inventario
            </button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filterSummary}>
            <span
              className={`${styles.filterStatusBadge} ${
                activeFilterCount > 0 ? styles.filterStatusBadgeActive : ""
              }`}
            >
              {activeFilterCount === 0
                ? "Sin filtros activos"
                : `${activeFilterCount} ${
                    activeFilterCount === 1
                      ? "filtro activo"
                      : "filtros activos"
                  }`}
            </span>

            <button
              type="button"
              className={styles.clearFiltersButton}
              onClick={handleClearAllFilters}
              disabled={activeFilterCount === 0}
            >
              Limpiar filtros
            </button>
          </div>

          <div className={styles.stockSummary}>
            <span className={styles.summaryItem}>
              <span className={styles.summaryDotOut} />
              Agotados: {stockSummary.outOfStock}
            </span>

            <span className={styles.summaryItem}>
              <span className={styles.summaryDotLow} />
              Stock bajo: {stockSummary.lowStock}
            </span>
          </div>
        </div>

        <div className={styles.meta}>
          <span>
            Sucursal seleccionada: <strong>{selectedBranchLabel}</strong>
          </span>

          <span className={styles.metaDivider}>·</span>

          <span>
            Mostrando <strong>{filteredRows.length}</strong> de{" "}
            <strong>{rows.length}</strong> producto(s)
          </span>
        </div>

        {loading && <div className={styles.info}>Cargando inventario...</div>}

        {!!error && <div className={styles.error}>{error}</div>}

        <InventoryReportTable
          rows={pageRows}
          loading={loading}
          expandedProductId={expandedProductId}
          otherStocksByProduct={otherStocksByProduct}
          loadingDetailsByProduct={loadingDetailsByProduct}
          detailsErrorByProduct={detailsErrorByProduct}
          onToggleOtherStocks={handleToggleOtherStocks}
          facetFilters={facetFilters}
          facetOptions={facetOptions}
          facetSearch={facetSearch}
          openFacet={openFacet}
          existenceQuantity={existenceQuantity}
          stockStatusCounts={stockStatusCounts}
          onToggleFacet={toggleFacet}
          onSearchFacet={handleSearchFacet}
          onSelectAllFacet={handleSelectAllFacet}
          onClearFacet={(key) => clearFacet(key, { close: true })}
          onToggleFacetValue={toggleFacetValue}
          onQuantityChange={handleExistenceQuantityChange}
          onApplyQuantity={applyExistenceQuantityFilter}
          onRemoveQuantity={removeExistenceQuantityFilter}
          onCloseFacet={closeFacet}
        />

        {filteredRows.length > 0 && (
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredRows.length}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            startIndex={startIndex}
            endIndex={endIndex}
            itemsNoun="productos"
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>
    </div>
  );
};

export default PageReport;
