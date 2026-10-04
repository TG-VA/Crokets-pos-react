import styles from "./PointsHistory.module.css";
import AppModal from "../../../AppModal/AppModal";
import PointsHistoryFilters from "./components/PointsHistoryFilters";
import PointsHistorySummary from "./components/PointsHistorySummary";
import PointsHistoryTable from "./components/PointsHistoryTable";
import { usePointsHistory } from "./hooks/usePointsHistory";

const PointsHistory = () => {
  const {
    appModal,
    branchFilter,
    branches,
    closeAppModal,
    customerSearchLabel,
    filteredMovements,
    handleClearFilters,
    hasActiveFilters,
    loadingMovements,
    movementFilter,
    refreshAll,
    searchTerm,
    setBranchFilter,
    setMovementFilter,
    setSearchTerm,
    summary,
  } = usePointsHistory();

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>HISTORIAL DE PUNTOS</h1>
          <p>
            Consulta movimientos globales de puntos acumulados, canjeados,
            descontados o ajustados por cliente.
          </p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={refreshAll}
          disabled={loadingMovements}
        >
          {loadingMovements ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <PointsHistorySummary
        summary={summary}
        hasCustomerSearch={Boolean(searchTerm.trim())}
      />

      <PointsHistoryFilters
        searchTerm={searchTerm}
        movementFilter={movementFilter}
        branchFilter={branchFilter}
        branches={branches}
        customerSearchLabel={customerSearchLabel}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={setSearchTerm}
        onMovementFilterChange={setMovementFilter}
        onBranchFilterChange={setBranchFilter}
        onClearFilters={handleClearFilters}
      />

      <PointsHistoryTable
        movements={filteredMovements}
        loadingMovements={loadingMovements}
      />

      <AppModal
        isOpen={appModal.isOpen}
        type={appModal.type}
        title={appModal.title}
        message={appModal.message}
        confirmText={appModal.confirmText}
        cancelText={appModal.cancelText}
        showCancel={appModal.showCancel}
        loading={appModal.loading}
        onConfirm={appModal.onConfirm || closeAppModal}
        onCancel={appModal.onCancel || closeAppModal}
        onClose={closeAppModal}
      />
    </div>
  );
};

export default PointsHistory;
