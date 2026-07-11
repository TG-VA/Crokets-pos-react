import React from "react";
import styles from "../PageReport.module.css";

import {
  QUANTITY_FILTER_PREFIX,
  STOCK_FILTER_OPTIONS,
} from "../utils/inventoryReportUtils";

const ExistenceFilterPopover = ({
  isOpen = false,
  selectedValues = [],
  quantity = "",
  stockStatusCounts = {},
  onQuantityChange,
  onApplyQuantity,
  onRemoveQuantity,
  onToggleStatus,
  onClear,
  onClose,
}) => {
  if (!isOpen) {
    return null;
  }

  const activeQuantityFilter = selectedValues.find((value) =>
    value.startsWith(QUANTITY_FILTER_PREFIX)
  );

  return (
    <div
      className={`${styles.filterPopover} ${styles.existencePopover}`}
      data-inv-filter-popover="existencia"
    >
      <div className={styles.existenceSection}>
        <span className={styles.existenceSectionTitle}>
          Buscar cantidad exacta
        </span>

        <div className={styles.quantityFilterRow}>
          <input
            type="text"
            inputMode="numeric"
            className={styles.quantityFilterInput}
            placeholder="Ej. 7"
            value={quantity}
            onChange={onQuantityChange}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onApplyQuantity?.();
              }
            }}
          />

          <button
            type="button"
            className={styles.quantityApplyButton}
            onClick={onApplyQuantity}
            disabled={!String(quantity).trim()}
          >
            Aplicar
          </button>
        </div>

        {activeQuantityFilter && (
          <div className={styles.activeQuantityFilter}>
            <span>
              Cantidad:{" "}
              <strong>
                {activeQuantityFilter.replace(
                  QUANTITY_FILTER_PREFIX,
                  ""
                )}
              </strong>
            </span>

            <button
              type="button"
              className={styles.removeQuantityButton}
              onClick={onRemoveQuantity}
              aria-label="Eliminar filtro de cantidad"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className={styles.existenceDivider} />

      <div className={styles.existenceSection}>
        <span className={styles.existenceSectionTitle}>
          Estado del inventario
        </span>

        <div className={styles.stockStatusOptions}>
          {STOCK_FILTER_OPTIONS.map((option) => {
            const checked = selectedValues.includes(option.value);

            return (
              <label
                key={option.value}
                className={`${styles.stockStatusOption} ${
                  checked ? styles.stockStatusOptionActive : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleStatus?.(option.value)}
                />

                <span
                  className={`${styles.stockStatusDot} ${
                    styles[`${option.statusType}Dot`]
                  }`}
                />

                <span className={styles.stockStatusLabel}>
                  {option.label}
                </span>

                <span className={styles.stockStatusCount}>
                  {stockStatusCounts[option.statusType] || 0}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className={styles.existenceFooter}>
        <button
          type="button"
          className={styles.filterMiniButton}
          onClick={onClear}
        >
          Limpiar
        </button>

        <button
          type="button"
          className={styles.existenceDoneButton}
          onClick={onClose}
        >
          Listo
        </button>
      </div>
    </div>
  );
};

export default ExistenceFilterPopover;