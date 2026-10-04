import styles from "./FiscalCustomerModal.module.css";
import AppModal from "../../../AppModal/AppModal";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

import FiscalCustomerFormSection from "./components/FiscalCustomerFormSection";
import FiscalCustomerSearchSection from "./components/FiscalCustomerSearchSection";
import { useFiscalCustomerModal } from "./hooks/useFiscalCustomerModal";

/**
 * Modal de alta y edicion de datos fiscales de un cliente.
 *
 * La vista solo compone: el estado, la validacion y las consultas viven en
 * `useFiscalCustomerModal` y sus servicios.
 */
const FiscalCustomerModal = ({
  isOpen,
  onClose,
  onSaved,
  customerToEdit = null,
}) => {
  const {
    appModal,
    cfdiUses,
    closeAppModal,
    error,
    fieldStatus,
    form,
    handleAppModalConfirm,
    handleChange,
    handleCreateNew,
    handleSave,
    handleSearch,
    handleSearchTermChange,
    handleSelectCustomer,
    hasSearched,
    isEditMode,
    loadingSearch,
    matches,
    mode,
    postalError,
    postalInfo,
    postalLoading,
    saveDisabled,
    saving,
    searchTerm,
    setMode,
    taxRegimes,
    touched,
  } = useFiscalCustomerModal({ isOpen, onClose, onSaved, customerToEdit });

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2>
              {isEditMode ? "Editar datos fiscales" : "Agregar datos fiscales"}
            </h2>
            <p>Captura únicamente la información fiscal necesaria para CFDI.</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
          >
            <img
              src={XmarkIcon}
              alt=""
              className={styles.closeIcon}
              aria-hidden="true"
            />
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {!isEditMode && mode === "search" && (
          <FiscalCustomerSearchSection
            hasSearched={hasSearched}
            loadingSearch={loadingSearch}
            matches={matches}
            onCreateNew={handleCreateNew}
            onSearch={handleSearch}
            onSearchTermChange={handleSearchTermChange}
            onSelectCustomer={handleSelectCustomer}
            searchTerm={searchTerm}
          />
        )}

        {mode === "form" && (
          <FiscalCustomerFormSection
            cfdiUses={cfdiUses}
            fieldStatus={fieldStatus}
            form={form}
            onBack={() => setMode("search")}
            onCancel={onClose}
            onChange={handleChange}
            onSave={handleSave}
            postalError={postalError}
            postalInfo={postalInfo}
            postalLoading={postalLoading}
            saveDisabled={saveDisabled}
            saving={saving}
            showBackButton={!isEditMode}
            taxRegimes={taxRegimes}
            touched={touched}
          />
        )}
      </div>

      <AppModal
        isOpen={appModal.isOpen}
        type={appModal.type}
        title={appModal.title}
        message={appModal.message}
        confirmText={appModal.confirmText}
        cancelText={appModal.cancelText}
        showCancel={appModal.showCancel}
        loading={saving}
        onConfirm={handleAppModalConfirm}
        onCancel={closeAppModal}
        onClose={closeAppModal}
      />
    </div>
  );
};

export default FiscalCustomerModal;
