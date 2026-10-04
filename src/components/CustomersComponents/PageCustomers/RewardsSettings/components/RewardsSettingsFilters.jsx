import styles from "../RewardsSettings.module.css";

/**
 * Filtros del catalogo de recompensas: busqueda, estado y refresco.
 */
const RewardsSettingsFilters = ({
  searchTerm,
  statusFilter,
  loadingRewards,
  loadingPointsRule,
  onSearchChange,
  onStatusFilterChange,
  onRefresh,
}) => {
  return (
    <div className={styles.filters}>
      <div className={styles.searchContainer}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Buscar por nombre, descripción, puntos, tipo o beneficio..."
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

      <select
        className={styles.statusFilter}
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
      >
        <option value="all">Todas</option>
        <option value="active">Activas</option>
        <option value="inactive">Inactivas</option>
      </select>

      <button
        type="button"
        className={styles.refreshButton}
        onClick={onRefresh}
        disabled={loadingRewards || loadingPointsRule}
      >
        {loadingRewards || loadingPointsRule ? "Actualizando..." : "Actualizar"}
      </button>
    </div>
  );
};

export default RewardsSettingsFilters;
