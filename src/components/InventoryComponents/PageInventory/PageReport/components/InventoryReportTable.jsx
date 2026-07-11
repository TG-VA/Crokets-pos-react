import React from "react";
import styles from "./InventoryReportTable.module.css";

import InventoryReportRow from "./InventoryReportRow";
import FacetFilterButton from "./FacetFilterButton";
import FacetFilterPopover from "./FacetFilterPopover";
import ExistenceFilterPopover from "./ExistenceFilterPopover";

const InventoryReportTable = ({
  rows = [],
  loading = false,
  expandedProductId = null,
  otherStocksByProduct = {},
  loadingDetailsByProduct = {},
  detailsErrorByProduct = {},
  onToggleOtherStocks,

  facetFilters = {},
  facetOptions = {},
  facetSearch = {},
  openFacet = null,
  existenceQuantity = "",
  stockStatusCounts = {},

  onToggleFacet,
  onSearchFacet,
  onSelectAllFacet,
  onClearFacet,
  onToggleFacetValue,
  onQuantityChange,
  onApplyQuantity,
  onRemoveQuantity,
  onCloseFacet,
}) => {
  const renderStandardFilter = (filterKey) => (
    <>
      <FacetFilterButton
        filterKey={filterKey}
        selectedCount={facetFilters[filterKey]?.length || 0}
        isOpen={openFacet === filterKey}
        onToggle={onToggleFacet}
      />

      <FacetFilterPopover
        filterKey={filterKey}
        isOpen={openFacet === filterKey}
        options={facetOptions[filterKey] || []}
        selectedValues={facetFilters[filterKey] || []}
        searchValue={facetSearch[filterKey] || ""}
        onSearchChange={onSearchFacet}
        onSelectAll={onSelectAllFacet}
        onClear={onClearFacet}
        onToggleValue={onToggleFacetValue}
      />
    </>
  );

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <colgroup>
          <col className={styles.codeColumn} />
          <col className={styles.nameColumn} />
          <col className={styles.departmentColumn} />
          <col className={styles.existenceColumn} />
          <col className={styles.minimumColumn} />
          <col className={styles.maximumColumn} />
          <col className={styles.detailColumn} />
        </colgroup>

        <thead>
          <tr>
            <th>Código</th>

            <th>
              <div className={styles.thInner}>
                <span className={styles.thLabel}>Nombre</span>
                {renderStandardFilter("nombre")}
              </div>
            </th>

            <th>
              <div className={styles.thInner}>
                <span className={styles.thLabel}>Departamento</span>
                {renderStandardFilter("depto")}
              </div>
            </th>

            <th>
              <div className={styles.thInner}>
                <span className={styles.thLabel}>Existencia</span>

                <FacetFilterButton
                  filterKey="existencia"
                  selectedCount={
                    facetFilters.existencia?.length || 0
                  }
                  isOpen={openFacet === "existencia"}
                  onToggle={onToggleFacet}
                />

                <ExistenceFilterPopover
                  isOpen={openFacet === "existencia"}
                  selectedValues={facetFilters.existencia || []}
                  quantity={existenceQuantity}
                  stockStatusCounts={stockStatusCounts}
                  onQuantityChange={onQuantityChange}
                  onApplyQuantity={onApplyQuantity}
                  onRemoveQuantity={onRemoveQuantity}
                  onToggleStatus={(value) =>
                    onToggleFacetValue?.("existencia", value, {
                      close: false,
                    })
                  }
                  onClear={() => onClearFacet?.("existencia")}
                  onClose={onCloseFacet}
                />
              </div>
            </th>

            <th>Mín</th>
            <th>Máx</th>
            <th>Detalle</th>
          </tr>
        </thead>

        <tbody>
          {!loading && rows.length === 0 ? (
            <tr>
              <td colSpan={7} className={styles.empty}>
                No hay productos que coincidan con los filtros
                seleccionados.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const productId = row.productId;

              return (
                <InventoryReportRow
                  key={row.inventoryRowId ?? productId}
                  row={row}
                  isExpanded={expandedProductId === productId}
                  detailRows={
                    otherStocksByProduct[productId] || []
                  }
                  detailsLoading={
                    !!loadingDetailsByProduct[productId]
                  }
                  detailsError={
                    detailsErrorByProduct[productId] || ""
                  }
                  onToggleOtherStocks={onToggleOtherStocks}
                />
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryReportTable;