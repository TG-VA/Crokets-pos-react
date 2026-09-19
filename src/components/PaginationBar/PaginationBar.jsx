import React from "react";
import styles from "./PaginationBar.module.css";

const PaginationBar = ({
  currentPage,
  totalPages,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  totalItems = 0,
  startIndex,
  endIndex,
  itemsNoun = "elementos",
  labelMode = "range",
  selectorLabel = "Por página:",
  modal = false,
}) => {
  const from =
    startIndex !== undefined
      ? startIndex
      : Math.max(0, (currentPage - 1) * (pageSize || 1));
  const to =
    endIndex !== undefined
      ? endIndex
      : Math.min(currentPage * (pageSize || 1), totalItems);

  const renderLabel = () => {
    if (labelMode === "pageCount") {
      return (
        <>
          Página {currentPage} de {totalPages} ({totalItems} {itemsNoun})
        </>
      );
    }
    if (labelMode === "pageIndex") {
      return (
        <>
          Página {currentPage} de {totalPages}
        </>
      );
    }
    return (
      <>
        Mostrando {from + 1} a {to} de {totalItems} {itemsNoun}
      </>
    );
  };

  const wrapperClassName = `${styles.paginationWrapper}${
    modal ? ` ${styles.modalPaginationWrapper}` : ""
  }`.trim();

  return (
    <div className={wrapperClassName}>
      <div className={styles.paginationInfo}>
        <span>{renderLabel()}</span>
        {pageSizeOptions && pageSizeOptions.length > 1 && (
          <>
            <span className={styles.paginationDivider}>|</span>
            <label className={styles.pageSizeLabel}>
              {selectorLabel}
              <select
                className={styles.pageSizeSelect}
                value={pageSize ?? pageSizeOptions[0]}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
      <div className={styles.paginationControls}>
        <button
          type="button"
          className={styles.pageBtn}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          Anterior
        </button>
        <span className={styles.pageIndicator}>
          Página {currentPage} de {totalPages}
        </span>
        <button
          type="button"
          className={styles.pageBtn}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default PaginationBar;
