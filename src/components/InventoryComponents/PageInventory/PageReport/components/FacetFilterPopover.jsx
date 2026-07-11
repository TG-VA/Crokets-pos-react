import React, { useMemo } from "react";
import styles from "../PageReport.module.css";

const FacetFilterPopover = ({
  filterKey,
  isOpen = false,
  options = [],
  selectedValues = [],
  searchValue = "",
  onSearchChange,
  onSelectAll,
  onClear,
  onToggleValue,
}) => {
  const visibleOptions = useMemo(() => {
    const normalizedSearch = String(searchValue || "")
      .trim()
      .toUpperCase();

    if (!normalizedSearch) {
      return options;
    }

    return options.filter((item) =>
      String(item.label || "")
        .toUpperCase()
        .includes(normalizedSearch)
    );
  }, [options, searchValue]);

  if (!isOpen) {
    return null;
  }

  const allValues = options.map((item) => item.value);

  return (
    <div
      className={styles.filterPopover}
      data-inv-filter-popover={filterKey}
    >
      <div className={styles.filterPopoverHeader}>
        <input
          type="text"
          className={styles.filterSearch}
          placeholder="Buscar..."
          value={searchValue}
          onChange={(event) =>
            onSearchChange?.(filterKey, event.target.value)
          }
        />
      </div>

      <div className={styles.filterPopoverActions}>
        <button
          type="button"
          className={styles.filterMiniButton}
          onClick={() => onSelectAll?.(filterKey, allValues)}
        >
          Seleccionar todo
        </button>

        <button
          type="button"
          className={styles.filterMiniButton}
          onClick={() => onClear?.(filterKey)}
        >
          Limpiar
        </button>
      </div>

      <div className={styles.filterList}>
        {visibleOptions.length === 0 ? (
          <div className={styles.filterEmpty}>Sin coincidencias</div>
        ) : (
          visibleOptions.map((item) => {
            const checked = selectedValues.includes(item.value);

            return (
              <label
                key={`${filterKey}-${item.value}`}
                className={styles.filterOption}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onToggleValue?.(filterKey, item.value)
                  }
                />

                <span className={styles.filterOptionLabel}>
                  {item.label}
                </span>

                <span className={styles.filterOptionCount}>
                  {item.count}
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FacetFilterPopover;