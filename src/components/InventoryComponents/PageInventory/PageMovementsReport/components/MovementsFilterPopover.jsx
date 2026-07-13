import React from "react";

import styles from "./MovementsFilterPopover.module.css";

const MovementsFilterPopover = ({
  facetKey,
  searchValue = "",
  options = [],
  onSearchChange,
  onClearSearch,
  onShowAll,
  onShowNone,
  onToggleValue,
  isValueSelected,
}) => {
  const normalizedOptions = Array.isArray(options)
    ? options
    : [];

  return (
    <div
      className={styles.filterPopover}
      data-mov-filter-popover={facetKey}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
    >
      <div className={styles.filterPopoverHeader}>
        <input
          className={styles.filterSearch}
          type="text"
          value={searchValue}
          onChange={(event) => {
            onSearchChange?.(event.target.value);
          }}
          placeholder="Buscar..."
          aria-label="Buscar dentro del filtro"
          autoFocus
        />

        <button
          type="button"
          className={styles.filterMiniButton}
          onClick={() => {
            onClearSearch?.();
          }}
        >
          Limpiar
        </button>
      </div>

      <div className={styles.filterPopoverActions}>
        <button
          type="button"
          className={styles.filterMiniButton}
          onClick={() => {
            onShowAll?.();
          }}
        >
          Todos
        </button>

        <button
          type="button"
          className={styles.filterMiniButton}
          onClick={() => {
            onShowNone?.();
          }}
        >
          Ninguno
        </button>
      </div>

      <div className={styles.filterList}>
        {normalizedOptions.length === 0 ? (
          <div className={styles.filterEmpty}>
            No hay opciones para mostrar.
          </div>
        ) : (
          normalizedOptions.map((option) => {
            const selected =
              isValueSelected?.(option.value) ??
              false;

            return (
              <label
                key={option.value}
                className={styles.filterOption}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    onToggleValue?.(option.value);
                  }}
                />

                <span
                  className={styles.filterOptionLabel}
                  title={option.label}
                >
                  {option.label}
                </span>

                <span
                  className={styles.filterOptionCount}
                >
                  {option.count}
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MovementsFilterPopover;