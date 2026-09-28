import React from "react";
import styles from "./RewardsAvailability.module.css";
import AppModal from "../../../AppModal/AppModal";
import RewardsAvailabilityCustomerSearch from "./RewardsAvailabilityCustomerSearch";
import RewardsAvailabilityCustomerSummary from "./RewardsAvailabilityCustomerSummary";
import RewardsAvailabilityRewardsGrid from "./RewardsAvailabilityRewardsGrid";
import { useRewardsAvailability } from "./useRewardsAvailability";

const RewardsAvailability = () => {
  const {
    appModal,
    closeAppModal,
    customerPoints,
    customerResults,
    customerSearch,
    handleClearCustomer,
    handleManualSearch,
    handleSearchChange,
    handleSelectCustomer,
    hasSelectedCustomer,
    loadRewards,
    loadingCustomers,
    loadingPoints,
    loadingRewards,
    rewards,
    rewardsStats,
    selectedCustomer,
  } = useRewardsAvailability();

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>CONSULTA DE RECOMPENSAS</h1>
          <p>
            Busca un cliente para consultar sus puntos y revisar qué recompensas
            tiene disponibles. Los canjes se realizan únicamente desde el módulo
            de ventas.
          </p>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <RewardsAvailabilityCustomerSearch
          customerSearch={customerSearch}
          customerResults={customerResults}
          selectedCustomer={selectedCustomer}
          loadingCustomers={loadingCustomers}
          onSearchChange={handleSearchChange}
          onManualSearch={handleManualSearch}
          onClear={handleClearCustomer}
          onSelectCustomer={handleSelectCustomer}
        />

        <RewardsAvailabilityCustomerSummary
          selectedCustomer={selectedCustomer}
          customerPoints={customerPoints}
          loadingPoints={loadingPoints}
          rewardsStats={rewardsStats}
        />
      </div>

      <RewardsAvailabilityRewardsGrid
        rewards={rewards}
        customerPoints={customerPoints}
        hasSelectedCustomer={hasSelectedCustomer}
        loadingRewards={loadingRewards}
        onRefresh={loadRewards}
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

export default RewardsAvailability;
