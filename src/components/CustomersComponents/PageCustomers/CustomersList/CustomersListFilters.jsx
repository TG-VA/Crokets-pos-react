import styles from "./CustomersList.module.css";

/**
 * Barra de filtros: busqueda por texto, estado y refresco del listado.
 */
const CustomersListFilters = ({
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
          className={styles.searchInput}
          placeholder="Buscar por nombre, teléfono o correo..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
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
        onChange={(e) => onStatusFilterChange(e.target.value)}
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

export default CustomersListFilters;
