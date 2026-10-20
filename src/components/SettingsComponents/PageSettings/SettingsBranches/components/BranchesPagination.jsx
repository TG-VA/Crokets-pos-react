import styles from "../SettingsBranches.module.css";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

const PAGE_SIZE_LABELS = {
  5: "5",
  10: "10",
  20: "20",
  all: "Todas",
};

const buildPageNumbers = (currentPage, totalPages) => {
  const pages = [];
  const windowSize = 5;
  let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }
  return pages;
};

const BranchesPagination = ({
  currentPage,
  totalPages,
  pageSize,
  pageSizeOptions,
  filteredCount,
  pageStart,
  pageEnd,
  loading,
  onPageChange,
  onPageSizeChange,
}) => (
  <div className={styles.pagination} aria-live="polite">
    <p className={styles.paginationSummary}>
      {loading
        ? "Cargando sucursales..."
        : `Mostrando ${pageStart} - ${pageEnd} de ${filteredCount} sucursales`}
    </p>

    <div className={styles.paginationControls}>
      <label className={styles.pageSizeField}>
        <span className={styles.pageSizeLabel}>Por página</span>
        <select
          className={styles.pageSizeSelect}
          value={String(pageSize)}
          onChange={(event) => onPageSizeChange(event.target.value)}
          aria-label="Sucursales por página"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={String(option)}>
              {PAGE_SIZE_LABELS[option] ?? option}
            </option>
          ))}
        </select>
      </label>

      <nav className={styles.pageNav} aria-label="Paginación de sucursales">
        <button
          type="button"
          className={styles.pageNavButton}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Página anterior"
        >
          Anterior
        </button>

        {buildPageNumbers(currentPage, totalPages).map((page) => (
          <button
            key={page}
            type="button"
            className={joinClasses(
              styles.pageNavButton,
              page === currentPage ? styles.pageNavButtonActive : ""
            )}
            onClick={() => onPageChange(page)}
            aria-label={`Ir a la página ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          className={styles.pageNavButton}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Página siguiente"
        >
          Siguiente
        </button>
      </nav>
    </div>
  </div>
);

export default BranchesPagination;
