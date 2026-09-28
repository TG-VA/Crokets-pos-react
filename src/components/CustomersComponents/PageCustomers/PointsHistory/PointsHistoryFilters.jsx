import styles from "./PointsHistory.module.css";

/**
 * Panel de filtros del historial: cliente, tipo de movimiento y sucursal.
 */
const PointsHistoryFilters = ({
  searchTerm,
  movementFilter,
  branchFilter,
  branches,
  customerSearchLabel,
  hasActiveFilters,
  onSearchChange,
  onMovementFilterChange,
  onBranchFilterChange,
  onClearFilters,
}) => {
  return (
    <div className={styles.filtersPanel}>
      <div className={styles.filtersHeader}>
        <div>
          <h2>Filtros de búsqueda</h2>
          <p>
            Busca por cliente. El resumen muestra el saldo global del cliente.
            Los filtros de tipo y sucursal solo afectan la tabla.
          </p>

          {customerSearchLabel && (
            <p>
              Mostrando historial de: <strong>{customerSearchLabel}</strong>
            </p>
          )}
        </div>

        <button
          type="button"
          className={styles.clearFiltersButton}
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
        >
          Limpiar filtros
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchContainer}>
          <label>Buscar cliente</label>

          <div className={styles.inputWrapper}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Nombre, teléfono o correo del cliente..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />

            {searchTerm && (
              <button
                type="button"
                className={styles.clearSearchButton}
                onClick={() => onSearchChange("")}
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label>Tipo de movimiento</label>
          <select
            className={styles.filterSelect}
            value={movementFilter}
            onChange={(e) => onMovementFilterChange(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="earn">Puntos ganados</option>
            <option value="redeem">Puntos descontados</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Sucursal</label>
          <select
            className={styles.filterSelect}
            value={branchFilter}
            onChange={(e) => onBranchFilterChange(e.target.value)}
          >
            <option value="all">Todas</option>

            {branches.map((branchItem) => (
              <option key={branchItem.id} value={branchItem.id}>
                {branchItem.name || branchItem.code || "SIN NOMBRE"}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default PointsHistoryFilters;
