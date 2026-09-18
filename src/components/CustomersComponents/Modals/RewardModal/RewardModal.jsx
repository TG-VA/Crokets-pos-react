import styles from "./RewardModal.module.css";
import AppModal from "../../../AppModal/AppModal";
import { useEscapeKey } from "../../../../hooks/useEscapeKey";
import {
  DESCRIPTION_MAX_LENGTH,
  NAME_MAX_LENGTH,
  getRewardFieldState,
} from "./rewardModalCalculationService";
import { useRewardModal } from "./useRewardModal";
import RewardDiscountFields from "./RewardDiscountFields";
import RewardProductSelector from "./RewardProductSelector";

const RewardModal = ({ isOpen, onClose, onSaved, rewardToEdit }) => {
  const {
    formData,
    selectedProductIds,
    selectedProducts,
    filteredProducts,
    productSearchTerm,
    setProductSearchTerm,
    loadingProducts,
    saving,
    fieldErrors,
    touchedFields,
    appModal,
    isEditing,
    requiresProducts,
    requiresDiscount,
    canSave,
    handleChange,
    handleRewardTypeChange,
    handleBlur,
    handleProductToggle,
    handleRequestClose,
    handleSubmit,
    closeAppModal,
  } = useRewardModal({ isOpen, onClose, onSaved, rewardToEdit });

  const getFieldClassName = (field) => {
    const state = getRewardFieldState({
      field,
      touchedFields,
      fieldErrors,
      formData,
    });

    if (state === "invalid") return styles.inputInvalid;
    if (state === "valid") return styles.inputValid;
    return "";
  };

  useEscapeKey(
    (event) => {
      event.preventDefault();
      onClose();
    },
    isOpen && !saving && !appModal.isOpen
  );

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleRequestClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="reward-modal-title">
            {isEditing ? "Editar recompensa" : "Nueva recompensa"}
          </h2>

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
          <div className={styles.fieldGroup}>
            <label>Nombre de la recompensa *</label>
            <input
              type="text"
              maxLength={NAME_MAX_LENGTH}
              value={formData.name}
              onChange={(event) => handleChange("name", event.target.value)}
              onBlur={() => handleBlur("name")}
              disabled={saving}
              autoFocus
              className={getFieldClassName("name")}
            />

            {touchedFields.name && fieldErrors.name && (
              <span className={styles.fieldError}>{fieldErrors.name}</span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label>Puntos requeridos *</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={formData.points_required}
              onChange={(event) =>
                handleChange("points_required", event.target.value)
              }
              onBlur={() => handleBlur("points_required")}
              disabled={saving}
              className={getFieldClassName("points_required")}
            />

            {touchedFields.points_required && fieldErrors.points_required && (
              <span className={styles.fieldError}>
                {fieldErrors.points_required}
              </span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label>Tipo de recompensa *</label>
            <select
              value={formData.reward_type}
              onChange={(event) => handleRewardTypeChange(event.target.value)}
              onBlur={() => handleBlur("reward_type")}
              disabled={saving}
              className={getFieldClassName("reward_type")}
            >
              <option value="free_product">Producto gratis</option>
              <option value="product_discount">Descuento en producto</option>
            </select>

            {touchedFields.reward_type && fieldErrors.reward_type && (
              <span className={styles.fieldError}>
                {fieldErrors.reward_type}
              </span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label>
              {formData.reward_type === "free_product"
                ? "Cantidad gratis *"
                : "Cantidad de unidades aplicables *"}
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={3}
              value={formData.reward_quantity}
              onChange={(event) =>
                handleChange("reward_quantity", event.target.value)
              }
              onBlur={() => handleBlur("reward_quantity")}
              disabled={saving}
              className={getFieldClassName("reward_quantity")}
            />

            {touchedFields.reward_quantity && fieldErrors.reward_quantity && (
              <span className={styles.fieldError}>
                {fieldErrors.reward_quantity}
              </span>
            )}
          </div>

          {requiresDiscount && (
            <RewardDiscountFields
              formData={formData}
              fieldErrors={fieldErrors}
              touchedFields={touchedFields}
              saving={saving}
              handleChange={handleChange}
              handleBlur={handleBlur}
              getFieldClassName={getFieldClassName}
            />
          )}

          {requiresProducts && (
            <RewardProductSelector
              productSearchTerm={productSearchTerm}
              onSearchChange={setProductSearchTerm}
              loadingProducts={loadingProducts}
              saving={saving}
              filteredProducts={filteredProducts}
              selectedProducts={selectedProducts}
              selectedProductCount={selectedProductIds.length}
              onToggleProduct={handleProductToggle}
              productsError={fieldErrors.products}
            />
          )}

          <div className={styles.fieldGroup}>
            <label>Descripción</label>
            <textarea
              maxLength={DESCRIPTION_MAX_LENGTH}
              value={formData.description}
              onChange={(event) =>
                handleChange("description", event.target.value)
              }
              onBlur={() => handleBlur("description")}
              disabled={saving}
              rows={4}
            />

            <span className={styles.descriptionCounter}>
              {String(formData.description || "").length}/
              {DESCRIPTION_MAX_LENGTH}
            </span>

            {touchedFields.description && fieldErrors.description && (
              <span className={styles.fieldError}>
                {fieldErrors.description}
              </span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label>Estado</label>
            <select
              value={formData.is_active ? "active" : "inactive"}
              onChange={(event) =>
                handleChange("is_active", event.target.value === "active")
              }
              disabled={saving}
            >
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
            </select>
          </div>

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
                !canSave && !saving ? "Completa los campos correctamente." : ""
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

export default RewardModal;
