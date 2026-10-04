import styles from "../InvoicesHistory.module.css";
import XmarkIcon from "../../../../../assets/icons/xmark-solid-full.svg";
import { getBranchLabel } from "../../../utils/invoiceFormatters";

/**
 * Filtros del historial: rango de fechas, sucursal y busqueda por texto.
 */
const InvoicesHistoryFilters = ({
  startDate,
  endDate,
  branchFilter,
  branches,
  currentBranch,
  branchMaxDate,
  searchTerm,
  onStartDateChange,
  onEndDateChange,
  onBranchFilterChange,
  onSearchChange,
}) => {
  return (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <label>Desde</label>
        <input
          type="date"
          className={styles.dateInput}
          value={startDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          max={endDate || branchMaxDate}
        />
      </div>

      <div className={styles.filterGroup}>
        <label>Hasta</label>
        <input
          type="date"
          className={styles.dateInput}
          value={endDate}
          onChange={(event) => onEndDateChange(event.target.value)}
          min={startDate}
          max={branchMaxDate}
        />
      </div>

      <div className={styles.filterGroup}>
        <label>Sucursal</label>
        <select
          className={styles.dateInput}
          value={branchFilter}
          onChange={(event) => onBranchFilterChange(event.target.value)}
        >
          <option value="current">
            Actual: {getBranchLabel(currentBranch)}
          </option>
          <option value="all">Todas las sucursales</option>

          {branches.map((branchItem) => (
            <option key={branchItem.id} value={branchItem.id}>
              {getBranchLabel(branchItem)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.searchContainer}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Buscar por folio, UUID, RFC, razón social, sucursal o estado..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
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

export default InvoicesHistoryFilters;
