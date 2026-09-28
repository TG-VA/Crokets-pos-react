import React from "react";
import styles from "./RewardsSettings.module.css";
import AppModal from "../../../AppModal/AppModal";
import RewardModal from "../../Modals/RewardModal/RewardModal";
import RewardsSettingsFilters from "./RewardsSettingsFilters";
import RewardsSettingsPointsRule from "./RewardsSettingsPointsRule";
import RewardsSettingsRewardDetailsModal from "./RewardsSettingsRewardDetailsModal";
import RewardsSettingsTable from "./RewardsSettingsTable";
import { useRewardsSettings } from "./useRewardsSettings";

const RewardsSettings = () => {
  const {
    appModal,
    canSavePointsRule,
    closeAppModal,
    editingReward,
    examplePoints,
    filteredRewards,
    handleCloseRewardDetailsModal,
    handleCloseRewardModal,
    handleEditReward,
    handleNewReward,
    handleOpenRewardDetailsModal,
    handleOpenStatusConfirmModal,
    handlePointsAmountChange,
    handleRefresh,
    handleSavePointsRule,
    hasPointsRuleChanges,
    isRewardModalOpen,
    loadRewards,
    loadingPointsRule,
    loadingRewards,
    pointsAmountPerPoint,
    rewardDetailsModal,
    savingPointsRule,
    searchTerm,
    setSearchTerm,
    setStatusFilter,
    statusFilter,
  } = useRewardsSettings();

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>CONFIGURAR RECOMPENSAS</h1>
          <p>
            Administra las recompensas disponibles, los puntos requeridos y la
            regla de acumulación para clientes.
          </p>
        </div>

        <button
          type="button"
          className={styles.newButton}
          onClick={handleNewReward}
        >
          + Nueva recompensa
        </button>
      </div>

      <RewardsSettingsPointsRule
        pointsAmountPerPoint={pointsAmountPerPoint}
        examplePoints={examplePoints}
        canSavePointsRule={canSavePointsRule}
        hasPointsRuleChanges={hasPointsRuleChanges}
        loadingPointsRule={loadingPointsRule}
        savingPointsRule={savingPointsRule}
        onPointsAmountChange={handlePointsAmountChange}
        onSavePointsRule={handleSavePointsRule}
      />

      <RewardsSettingsFilters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        loadingRewards={loadingRewards}
        loadingPointsRule={loadingPointsRule}
        onSearchChange={setSearchTerm}
        onStatusFilterChange={setStatusFilter}
        onRefresh={handleRefresh}
      />

      <RewardsSettingsTable
        rewards={filteredRewards}
        loadingRewards={loadingRewards}
        onEditReward={handleEditReward}
        onOpenStatusConfirmModal={handleOpenStatusConfirmModal}
        onOpenRewardDetailsModal={handleOpenRewardDetailsModal}
      />

      <RewardModal
        isOpen={isRewardModalOpen}
        onClose={handleCloseRewardModal}
        onSaved={loadRewards}
        rewardToEdit={editingReward}
      />

      {rewardDetailsModal.isOpen && (
        <RewardsSettingsRewardDetailsModal
          reward={rewardDetailsModal.reward}
          onClose={handleCloseRewardDetailsModal}
        />
      )}

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

export default RewardsSettings;
