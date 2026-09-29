import styles from "../InvoiceCustomers.module.css";

/**
 * Buscador, filtro por estado y accion de actualizar.
 */
const InvoiceCustomersFilters = ({
  searchTerm,
  statusFilter,
  loadingCustomers,
  onSearchChange,
  onStatusFilterChange,
  onClearSearch,
  onRefresh,
}) => {
  return (
    <div className={styles.filters}>
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Buscar por RFC, razón social, teléfono o correo..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className={styles.searchInput}
        />

        {searchTerm && (
          <button
            type="button"
            className={styles.clearSearchButton}
            onClick={onClearSearch}
          >
            ×
          </button>
        )}
      </div>

      <select
        className={styles.statusFilter}
        value={statusFilter}
        onChange={(event) => onStatusFilterChange(event.target.value)}
      >
        <option value="all">Todos</option>
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
      </select>

      <button
        type="button"
        className={styles.refreshButton}
        onClick={onRefresh}
        disabled={loadingCustomers}
      >
        {loadingCustomers ? "Actualizando..." : "Actualizar"}
      </button>
    </div>
  );
};

export default InvoiceCustomersFilters;
