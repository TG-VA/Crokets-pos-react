import React, { useEffect, useMemo, useState } from "react";
import styles from "./PageReport.module.css";

import InventoryReportTable from "./components/InventoryReportTable";

import useInventoryReport from "./hooks/useInventoryReport";
import useInventoryBranchDetails from "./hooks/useInventoryBranchDetails";

import {
  QUANTITY_FILTER_PREFIX,
  INITIAL_FACET_FILTERS,
  getSelectedBranchLabel,
  getActiveFilterCount,
  filterInventoryRows,
  getStockSummary,
  getStockStatusCounts,
  buildFacetOptions,
} from "./utils/inventoryReportUtils";

import { exportInventoryReport } from "./utils/exportInventoryReport";

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

  const [facetFilters, setFacetFilters] = useState(
    INITIAL_FACET_FILTERS
  );

  const [openFacet, setOpenFacet] = useState(null);
  const [facetSearch, setFacetSearch] = useState({});
  const [existenceQuantity, setExistenceQuantity] = useState("");

  useEffect(() => {
    if (!openFacet) return undefined;

    const key = openFacet;

    const handleMouseDown = (event) => {
      const popover = event.target?.closest?.(
        `[data-inv-filter-popover="${key}"]`
      );

      const button = event.target?.closest?.(
        `[data-inv-filter-button="${key}"]`
      );

      if (popover || button) return;

      setOpenFacet(null);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenFacet(null);
      }
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openFacet]);

  const setFacet = (key, values, { close = false } = {}) => {
    setFacetFilters((previous) => ({
      ...previous,
      [key]: values,
    }));

    if (close) {
      setOpenFacet(null);
    }
  };

  const toggleFacetValue = (
    key,
    value,
    { close = true } = {}
  ) => {
    setFacetFilters((previous) => {
      const currentValues = Array.isArray(previous[key])
        ? previous[key]
        : [];

      const valueExists = currentValues.includes(value);

      return {
        ...previous,
        [key]: valueExists
          ? currentValues.filter((item) => item !== value)
          : [...currentValues, value],
      };
    });

    if (close) {
      setOpenFacet(null);
    }
  };

  const clearFacet = (key, { close = true } = {}) => {
    setFacet(key, [], { close });

    if (key === "existencia") {
      setExistenceQuantity("");
    }
  };

  const toggleFacet = (key) => {
    setOpenFacet((previous) => {
      const next = previous === key ? null : key;

      if (next && next !== "existencia") {
        setFacetSearch((current) => ({
          ...current,
          [key]: current?.[key] ?? "",
        }));
      }

      return next;
    });
  };

  const handleSearchFacet = (key, value) => {
    setFacetSearch((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSelectAllFacet = (key, values) => {
    setFacet(key, values, { close: true });
  };

  const clearAllFilters = () => {
    setFacetFilters({
      nombre: [],
      depto: [],
      existencia: [],
    });

    setFacetSearch({});
    setExistenceQuantity("");
    setOpenFacet(null);
    clearExpandedProduct();
  };

  const handleExistenceQuantityChange = (event) => {
    const value = event.target.value.replace(/\D/g, "");
    setExistenceQuantity(value);
  };

  const applyExistenceQuantityFilter = () => {
    const cleanQuantity = String(existenceQuantity || "").trim();

    if (!cleanQuantity) return;

    const normalizedQuantity = String(Number(cleanQuantity));
    const quantityFilter =
      `${QUANTITY_FILTER_PREFIX}${normalizedQuantity}`;

    setFacetFilters((previous) => {
      const currentValues = Array.isArray(previous.existencia)
        ? previous.existencia
        : [];

      const valuesWithoutPreviousQuantities = currentValues.filter(
        (value) => !value.startsWith(QUANTITY_FILTER_PREFIX)
      );

      return {
        ...previous,
        existencia: [
          ...valuesWithoutPreviousQuantities,
          quantityFilter,
        ],
      };
    });

    setExistenceQuantity(normalizedQuantity);
    setOpenFacet(null);
  };

  const removeExistenceQuantityFilter = () => {
    setFacetFilters((previous) => ({
      ...previous,
      existencia: previous.existencia.filter(
        (value) => !value.startsWith(QUANTITY_FILTER_PREFIX)
      ),
    }));

    setExistenceQuantity("");
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
      console.error(
        "Error exportando reporte de inventario:",
        exportError
      );
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.headingBlock}>
            <h1 className={styles.title}>
              Reporte de inventario
            </h1>

            <p className={styles.subtitle}>
              Consulta existencias, niveles mínimos y máximos por
              sucursal.
            </p>
          </div>

          <div className={styles.controls}>
            <div className={styles.controlField}>
              <label className={styles.label}>Sucursal</label>

              <select
                className={styles.select}
                value={selectedBranchId}
                onChange={(event) =>
                  handleBranchChange(event.target.value)
                }
              >
                {branchOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code
                      ? `${item.name} (${item.code})`
                      : item.name}
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
                activeFilterCount > 0
                  ? styles.filterStatusBadgeActive
                  : ""
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
              onClick={clearAllFilters}
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
            Sucursal seleccionada:{" "}
            <strong>{selectedBranchLabel}</strong>
          </span>

          <span className={styles.metaDivider}>·</span>

          <span>
            Mostrando <strong>{filteredRows.length}</strong> de{" "}
            <strong>{rows.length}</strong> producto(s)
          </span>
        </div>

        {loading && (
          <div className={styles.info}>Cargando inventario...</div>
        )}

        {!!error && <div className={styles.error}>{error}</div>}

        <InventoryReportTable
          rows={filteredRows}
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
          onClearFacet={(key) =>
            clearFacet(key, { close: true })
          }
          onToggleFacetValue={toggleFacetValue}
          onQuantityChange={handleExistenceQuantityChange}
          onApplyQuantity={applyExistenceQuantityFilter}
          onRemoveQuantity={removeExistenceQuantityFilter}
          onCloseFacet={() => setOpenFacet(null)}
        />
      </div>
    </div>
  );
};

export default PageReport;