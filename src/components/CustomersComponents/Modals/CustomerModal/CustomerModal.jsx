import React from "react";
import styles from "./CustomerModal.module.css";
import AppModal from "../../../AppModal/AppModal";
import CustomerModalFields from "./CustomerModalFields";
import { useCustomerModal } from "./useCustomerModal";

const CustomerModal = ({ isOpen, onClose, onSaved, customerToEdit }) => {
  const {
    appModal,
    canSave,
    closeAppModal,
    fieldErrors,
    formData,
    handleBlur,
    handleChange,
    handleRequestClose,
    handleSubmit,
    modalTitle,
    saving,
    touchedFields,
  } = useCustomerModal({ isOpen, onClose, onSaved, customerToEdit });

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleRequestClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="customer-modal-title">{modalTitle}</h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={handleRequestClose}
            disabled={saving}
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <CustomerModalFields
            formData={formData}
            fieldErrors={fieldErrors}
            touchedFields={touchedFields}
            saving={saving}
            onChange={handleChange}
            onBlur={handleBlur}
          />

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleRequestClose}
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className={styles.saveButton}
              disabled={!canSave}
              title={
                !canSave && !saving
                  ? "Completa nombre, teléfono y confirmación correctamente."
                  : ""
              }
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>

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

export default CustomerModal;
