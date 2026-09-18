import styles from "./RewardModal.module.css";

const RewardDiscountFields = ({
  formData,
  fieldErrors,
  touchedFields,
  saving,
  handleChange,
  handleBlur,
  getFieldClassName,
}) => {
  return (
    <>
      <div className={styles.fieldGroup}>
        <label>Tipo de descuento *</label>
        <select
          value={formData.discount_type}
          onChange={(event) =>
            handleChange("discount_type", event.target.value)
          }
          onBlur={() => handleBlur("discount_type")}
          disabled={saving}
          className={getFieldClassName("discount_type")}
        >
          <option value="">Selecciona tipo de descuento</option>
          <option value="percent">Porcentaje</option>
          <option value="fixed">Monto fijo</option>
        </select>

        {touchedFields.discount_type && fieldErrors.discount_type && (
          <span className={styles.fieldError}>{fieldErrors.discount_type}</span>
        )}
      </div>

      <div className={styles.fieldGroup}>
        <label>
          {formData.discount_type === "percent"
            ? "Porcentaje de descuento *"
            : "Monto de descuento *"}
        </label>
        <input
          type="text"
          inputMode="decimal"
          maxLength={8}
          value={formData.discount_value}
          onChange={(event) =>
            handleChange("discount_value", event.target.value)
          }
          onBlur={() => handleBlur("discount_value")}
          disabled={saving}
          placeholder={
            formData.discount_type === "percent"
              ? "Porcentaje de descuento "
              : "Monto de descuento MXN "
          }
          className={getFieldClassName("discount_value")}
        />

        {touchedFields.discount_value && fieldErrors.discount_value && (
          <span className={styles.fieldError}>
            {fieldErrors.discount_value}
          </span>
        )}
      </div>
    </>
  );
};

export default RewardDiscountFields;
