import React from "react";

import {
  buildRowView,
  isNoStockMovement,
} from "../utils/movementFormatters";

import MovementsFilterPopover from "./MovementsFilterPopover";

import styles from "./MovementsReportTable.module.css";

const COLUMN_CLASS_NAMES = {
  date: styles.colDate,
  product: styles.colProduct,
  ticket: styles.colTicket,
  type: styles.colType,
  qty: styles.colQty,
  prev: styles.colPrev,
  next: styles.colNew,
  reason: styles.colReason,
  user: styles.colUser,
};

const getStockValue = (rowView, stockValue) => {
  if (isNoStockMovement(rowView)) {
    return "—";
  }

  if (
    stockValue === null ||
    stockValue === undefined
  ) {
    return "—";
  }

  return stockValue;
};

const MovementsReportTable = ({
  rows = [],
  loading = false,

  columns = [],
  columnWidths = {},
  isResizing = false,

  filterableColumns,
  facetSearch = {},
  openFacet = null,

  onToggleFacet,
  onStartResize,

  getVisibleFacetOptions,
  setFacetSearchValue,
  clearFacetSearch,

  showAllFacetValues,
  showNoFacetValues,

  toggleFacetValue,
  isFacetValueSelected,
  getFacetActiveCount,
  isFacetActive,
}) => {
  const normalizedRows = Array.isArray(rows)
    ? rows
    : [];

  const normalizedColumns = Array.isArray(columns)
    ? columns
    : [];

  const isColumnFilterable = (columnKey) => {
    if (filterableColumns instanceof Set) {
      return filterableColumns.has(columnKey);
    }

    if (Array.isArray(filterableColumns)) {
      return filterableColumns.includes(columnKey);
    }

    return false;
  };

  return (
    <div
      className={`${styles.tableWrap} ${
        isResizing ? styles.resizing : ""
      }`}
    >
      <table className={styles.table}>
        <colgroup>
          {normalizedColumns.map((column) => (
            <col
              key={column.key}
              className={
                COLUMN_CLASS_NAMES[column.key] ?? ""
              }
              style={{
                width: columnWidths[column.key],
              }}
            />
          ))}
        </colgroup>

        <thead>
          <tr>
            {normalizedColumns.map(
              (column, index) => {
                const isFilterable =
                  isColumnFilterable(column.key);

                const isOpen =
                  openFacet === column.key;

                const active =
                  isFilterable &&
                  Boolean(
                    isFacetActive?.(column.key)
                  );

                const activeCount =
                  isFilterable
                    ? getFacetActiveCount?.(
                        column.key
                      )
                    : null;

                const showResizeHandle =
                  index <
                  normalizedColumns.length - 1;

                return (
                  <th key={column.key}>
                    <div className={styles.thInner}>
                      <span className={styles.thLabel}>
                        {column.label}
                      </span>

                      {isFilterable ? (
                        <button
                          type="button"
                          className={`${styles.filterButton} ${
                            active
                              ? styles.filterButtonActive
                              : ""
                          } ${
                            isOpen
                              ? styles.filterButtonOpen
                              : ""
                          }`}
                          onClick={() =>
                            onToggleFacet?.(
                              column.key
                            )
                          }
                          data-mov-filter-button={
                            column.key
                          }
                          aria-label={`Filtrar ${column.label}`}
                          aria-expanded={isOpen}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M3 5h18l-7 8v5l-4 1v-6L3 5z" />
                          </svg>

                          {active ? (
                            <span
                              className={
                                styles.filterBadge
                              }
                            >
                              {activeCount ?? 0}
                            </span>
                          ) : null}
                        </button>
                      ) : null}

                      {isFilterable && isOpen ? (
                        <MovementsFilterPopover
                          facetKey={column.key}
                          searchValue={
                            facetSearch?.[
                              column.key
                            ] ?? ""
                          }
                          options={
                            getVisibleFacetOptions?.(
                              column.key
                            ) ?? []
                          }
                          onSearchChange={(value) =>
                            setFacetSearchValue?.(
                              column.key,
                              value
                            )
                          }
                          onClearSearch={() =>
                            clearFacetSearch?.(
                              column.key
                            )
                          }
                          onShowAll={() =>
                            showAllFacetValues?.(
                              column.key
                            )
                          }
                          onShowNone={() =>
                            showNoFacetValues?.(
                              column.key
                            )
                          }
                          onToggleValue={(value) =>
                            toggleFacetValue?.(
                              column.key,
                              value
                            )
                          }
                          isValueSelected={(value) =>
                            isFacetValueSelected?.(
                              column.key,
                              value
                            ) ?? false
                          }
                        />
                      ) : null}

                      {showResizeHandle ? (
                        <span
                          className={
                            styles.resizeHandle
                          }
                          onMouseDown={(event) =>
                            onStartResize?.(
                              column.key,
                              column.min,
                              event
                            )
                          }
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Cambiar ancho de ${column.label}`}
                        />
                      ) : null}
                    </div>
                  </th>
                );
              }
            )}
          </tr>
        </thead>

        <tbody>
          {!loading &&
          normalizedRows.length === 0 ? (
            <tr>
              <td
                colSpan={
                  normalizedColumns.length || 9
                }
                className={styles.empty}
              >
                No hay movimientos que coincidan con
                los filtros seleccionados.
              </td>
            </tr>
          ) : (
            normalizedRows.map((row) => {
              const rowView =
                buildRowView(row);

              return (
                <tr
                  key={
                    row?.row_key ??
                    row?.id ??
                    `${row?.product_id}-${row?.created_at}`
                  }
                >
                  <td className={styles.dateCell}>
                    {rowView.soldAt}
                  </td>

                  <td className={styles.productCell}>
                    {rowView.productName}
                  </td>

                  <td className={styles.ticketCell}>
                    {rowView.ticket}
                  </td>

                  <td>{rowView.typeLabel}</td>

                  <td className={styles.center}>
                    {rowView.qty}
                  </td>

                  <td className={styles.center}>
                    {getStockValue(
                      rowView,
                      rowView.prev
                    )}
                  </td>

                  <td className={styles.center}>
                    {getStockValue(
                      rowView,
                      rowView.next
                    )}
                  </td>

                  <td>{rowView.reason}</td>

                  <td>{rowView.username}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MovementsReportTable;