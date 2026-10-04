import styles from "../InvoicesPending.module.css";
import XmarkIcon from "../../../../../assets/icons/xmark-solid-full.svg";

/**
 * Filtro por dia y buscador de la lista de ventas por facturar.
 */
const InvoicesPendingFilters = ({
  dateFilter,
  maxDate,
  searchTerm,
  onDateChange,
  onSearchChange,
}) => {
  return (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <label>Fecha</label>
        <input
          type="date"
          value={dateFilter}
          max={maxDate}
          onChange={(event) => onDateChange(event.target.value)}
          className={styles.dateInput}
        />
      </div>

      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Buscar por folio, razón social, RFC o cajero..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className={styles.searchInput}
        />

        {searchTerm && (
          <button
            type="button"
            className={styles.clearSearchButton}
            onClick={() => onSearchChange("")}
          >
            <img
              src={XmarkIcon}
              alt=""
              className={styles.clearSearchIcon}
              aria-hidden="true"
            />
          </button>
        )}
      </div>
    </div>
  );
};

export default InvoicesPendingFilters;
