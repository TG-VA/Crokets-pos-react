import React from "react";
import styles from "../PageReport.module.css";

const FacetFilterButton = ({
  filterKey,
  selectedCount = 0,
  isOpen = false,
  onToggle,
}) => {
  return (
    <button
      type="button"
      className={`${styles.filterButton} ${
        selectedCount > 0 ? styles.filterButtonActive : ""
      } ${isOpen ? styles.filterButtonOpen : ""}`}
      onClick={() => onToggle?.(filterKey)}
      data-inv-filter-button={filterKey}
      aria-label={`Filtrar ${filterKey}`}
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

      {selectedCount > 0 && (
        <span className={styles.filterBadge}>{selectedCount}</span>
      )}
    </button>
  );
};

export default FacetFilterButton;