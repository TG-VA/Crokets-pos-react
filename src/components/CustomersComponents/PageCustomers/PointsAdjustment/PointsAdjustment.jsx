import styles from "./PointsAdjustment.module.css";
import AppModal from "../../../AppModal/AppModal";
import PointsAdjustmentConfirmModal from "../../Modals/PointsAdjustmentConfirmModal/PointsAdjustmentConfirmModal";
import PointsAdjustmentAccessStates from "./components/PointsAdjustmentAccessStates";
import {
  PointsAdjustmentAdminNotice,
  PointsAdjustmentCustomerSearchCard,
  PointsAdjustmentSelectedCustomerCard,
} from "./components/PointsAdjustmentCustomerCards";
import PointsAdjustmentForm from "./components/PointsAdjustmentForm";
import { usePointsAdjustment } from "./hooks/usePointsAdjustment";

const PointsAdjustment = () => {
  const {
    adminAccessMessage,
    adminAccessStatus,
    adjustmentReason,
    adjustmentType,
    appModal,
    branch,
    canSubmit,
    closeAppModal,
    currentPoints,
    customers,
    handleClearAdjustment,
    handleClearSearch,
    handleCloseConfirmModal,
    handleConfirmAdjustment,
    handleOpenConfirmModal,
    handlePointsChange,
    handleReasonChange,
    handleSearchChange,
    handleSelectCustomer,
    isConfirmModalOpen,
    isOtherReason,
    loadingPoints,
    newBalance,
    normalizedFinalNotes,
    notes,
    numericPoints,
    pointsAmount,
    saving,
    searchCustomers,
    searchTerm,
    searchingCustomers,
    selectedCustomer,
    setAdjustmentType,
    setNotes,
    signedPoints,
  } = usePointsAdjustment();

  if (adminAccessStatus !== "allowed") {
    return (
      <PointsAdjustmentAccessStates
        status={adminAccessStatus}
        message={adminAccessMessage}
      />
    );
  }

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>AJUSTE DE PUNTOS</h1>
          <p>
            Agrega o descuenta puntos manualmente por migración, correcciones o
            ajustes autorizados.
          </p>
        </div>
      </div>

      <PointsAdjustmentAdminNotice branch={branch} />

      <div className={styles.mainGrid}>
        <PointsAdjustmentCustomerSearchCard
          searchTerm={searchTerm}
          customers={customers}
          searchingCustomers={searchingCustomers}
          selectedCustomer={selectedCustomer}
          onSearchChange={handleSearchChange}
          onSearch={() => searchCustomers(searchTerm)}
          onSelectCustomer={handleSelectCustomer}
          onClearSearch={handleClearSearch}
        />

        <PointsAdjustmentSelectedCustomerCard
          selectedCustomer={selectedCustomer}
          currentPoints={currentPoints}
          loadingPoints={loadingPoints}
        />
      </div>

      <PointsAdjustmentForm
        adjustmentType={adjustmentType}
        pointsAmount={pointsAmount}
        adjustmentReason={adjustmentReason}
        notes={notes}
        newBalance={newBalance}
        normalizedFinalNotes={normalizedFinalNotes}
        isOtherReason={isOtherReason}
        selectedCustomer={selectedCustomer}
        saving={saving}
        canSubmit={canSubmit}
        onAdjustmentTypeChange={setAdjustmentType}
        onPointsChange={handlePointsChange}
        onReasonChange={handleReasonChange}
        onNotesChange={setNotes}
        onClearForm={handleClearAdjustment}
        onSubmit={handleOpenConfirmModal}
      />

      <PointsAdjustmentConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={handleCloseConfirmModal}
        onConfirm={handleConfirmAdjustment}
        saving={saving}
        customer={selectedCustomer}
        adjustmentType={adjustmentType}
        currentPoints={currentPoints}
        pointsAmount={numericPoints}
        signedPoints={signedPoints}
        newBalance={newBalance}
        notes={normalizedFinalNotes}
        branch={branch}
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

export default PointsAdjustment;
