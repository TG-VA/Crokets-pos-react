import { useMemo, useState } from "react";

import MovementsReportControls from "./components/MovementsReportControls";
import MovementsReportTable from "./components/MovementsReportTable";
import PaginationBar from "../../../PaginationBar/PaginationBar";

import useMovementsFilters from "./hooks/useMovementsFilters";
import useMovementsRealtime from "./hooks/useMovementsRealtime";
import useMovementsReport from "./hooks/useMovementsReport";
import useResizableColumns from "./hooks/useResizableColumns";
import { usePagination } from "../../../../hooks/usePagination";

import { exportMovementsReport } from "./services/movementsExportService";

import styles from "./PageMovementsReports.module.css";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

const PageMovementsReport = () => {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const {
    branchOptions,
    selectedBranchId,
    selectedBranchLabel,

    startDateKey,
    endDateKey,
    startDateValue,
    endDateValue,
    rangePreset,
    currentRange,

    rows,
    loading,
    error,

    setSelectedBranchId,

    handleStartDateChange,
    handleEndDateChange,
    selectRangePreset,

    refreshMovementsSilently,
  } = useMovementsReport();

  useMovementsRealtime({
    selectedBranchId,
    refreshMovementsSilently,
  });

  const {
    filterableColumns,

    facetFilters,
    facetSearch,
    openFacet,

    filteredRows,
    periodRowsCount,

    toggleFacet,

    setFacetSearchValue,
    clearFacetSearch,

    showAllFacetValues,
    showNoFacetValues,

    toggleFacetValue,
    isFacetValueSelected,

    getFacetActiveCount,
    isFacetActive,
    getVisibleFacetOptions,

    resetAllFilters,
  } = useMovementsFilters({
    rows,
    startDateKey,
    endDateKey,
  });

  const { columns, columnWidths, isResizing, startResize } =
    useResizableColumns();

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
    resetKeys: [selectedBranchId, startDateKey, endDateKey, facetFilters],
  });

  const pageRows = pageItems(filteredRows);

  const activeFilterCount = useMemo(() => {
    return Object.values(facetFilters).filter((selection) => selection !== null)
      .length;
  }, [facetFilters]);

  const handleExportMovements = async () => {
    if (exporting || filteredRows.length === 0) {
      return;
    }

    setExporting(true);
    setExportError("");

    try {
      await exportMovementsReport({
        rows: filteredRows,
        branchLabel: selectedBranchLabel,
        rangePreset,
        currentRange,
        facetFilters,
      });
    } catch (exportException) {
      console.error(
        "Error exportando reporte de movimientos:",
        exportException
      );

      setExportError("No se pudo exportar el reporte de movimientos.");
    } finally {
      setExporting(false);
    }
  };

  const handleClearFilters = () => {
    resetAllFilters();
    setExportError("");
  };

  const displayedError = exportError || error;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.headingBlock}>
            <h1 className={styles.title}>Reporte de movimientos</h1>

            <p className={styles.subtitle}>
              Consulta entradas, salidas, ajustes, ventas y cambios de
              inventario por sucursal.
            </p>
          </div>

          <MovementsReportControls
            startDateValue={startDateValue}
            endDateValue={endDateValue}
            rangePreset={rangePreset}
            branchOptions={branchOptions}
            selectedBranchId={selectedBranchId}
            exporting={exporting}
            canExport={filteredRows.length > 0}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            onSelectRangePreset={selectRangePreset}
            onBranchChange={(branchId) => {
              setExportError("");
              setSelectedBranchId(branchId);
            }}
            onExport={handleExportMovements}
          />
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
              onClick={handleClearFilters}
              disabled={activeFilterCount === 0}
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <div className={styles.meta}>
          <span>
            Sucursal seleccionada: <strong>{selectedBranchLabel}</strong>
          </span>

          <span className={styles.metaDivider}>·</span>

          <span>
            Mostrando <strong>{filteredRows.length}</strong> de{" "}
            <strong>{periodRowsCount}</strong> movimiento(s)
          </span>
        </div>

        {loading && rows.length === 0 ? (
          <div className={styles.info}>Cargando movimientos...</div>
        ) : null}

        {displayedError ? (
          <div className={styles.error}>{displayedError}</div>
        ) : null}

        <MovementsReportTable
          rows={pageRows}
          loading={loading}
          columns={columns}
          columnWidths={columnWidths}
          isResizing={isResizing}
          filterableColumns={filterableColumns}
          facetFilters={facetFilters}
          facetSearch={facetSearch}
          openFacet={openFacet}
          onToggleFacet={toggleFacet}
          onStartResize={startResize}
          getVisibleFacetOptions={getVisibleFacetOptions}
          setFacetSearchValue={setFacetSearchValue}
          clearFacetSearch={clearFacetSearch}
          showAllFacetValues={showAllFacetValues}
          showNoFacetValues={showNoFacetValues}
          toggleFacetValue={toggleFacetValue}
          isFacetValueSelected={isFacetValueSelected}
          getFacetActiveCount={getFacetActiveCount}
          isFacetActive={isFacetActive}
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
            itemsNoun="movimientos"
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>
    </div>
  );
};

export default PageMovementsReport;
