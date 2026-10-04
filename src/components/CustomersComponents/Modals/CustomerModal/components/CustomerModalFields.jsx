import styles from "../CustomerModal.module.css";

/**
 * Campos del formulario de cliente.
 *
 * Presenta el estado de error por campo. La clase de un input depende de si el
 * campo ya fue tocado, tiene error o contiene un valor, por lo que vive aqui y
 * no en el hook: es una regla de presentacion.
 */
const CustomerModalFields = ({
  formData,
  fieldErrors,
  touchedFields,
  saving,
  onChange,
  onBlur,
}) => {
  const getFieldClassName = (field) => {
    if (!touchedFields[field]) return "";

    if (fieldErrors[field]) return styles.inputInvalid;

    return String(formData[field] ?? "").trim() ? styles.inputValid : "";
  };

  const renderError = (field) => {
    if (!touchedFields[field] || !fieldErrors[field]) return null;

    return <span className={styles.fieldError}>{fieldErrors[field]}</span>;
  };

  return (
    <>
      <div className={styles.fieldGroup}>
        <label>Nombre *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => onChange("name", e.target.value)}
          onBlur={() => onBlur("name")}
          disabled={saving}
          autoFocus
          className={getFieldClassName("name")}
        />

        {renderError("name")}
      </div>

      <div className={styles.twoColumns}>
        <div className={styles.fieldGroup}>
          <label>Teléfono *</label>
          <input
            type="text"
            inputMode="numeric"
            value={formData.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            onBlur={() => onBlur("phone")}
            disabled={saving}
            maxLength={10}
            className={getFieldClassName("phone")}
          />

          {renderError("phone")}
        </div>

        <div className={styles.fieldGroup}>
          <label>Confirmar teléfono *</label>
          <input
            type="text"
            inputMode="numeric"
            value={formData.phoneConfirm}
            onChange={(e) => onChange("phoneConfirm", e.target.value)}
            onBlur={() => onBlur("phoneConfirm")}
            disabled={saving}
            maxLength={10}
            className={getFieldClassName("phoneConfirm")}
          />

          {renderError("phoneConfirm")}
        </div>
      </div>

      <div className={styles.twoColumns}>
        <div className={styles.fieldGroup}>
          <label>Correo</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => onChange("email", e.target.value)}
            onBlur={() => onBlur("email")}
            disabled={saving}
            className={getFieldClassName("email")}
          />

          {renderError("email")}
        </div>

        <div className={styles.fieldGroup}>
          <label>Estado</label>
          <select
            value={formData.status ? "active" : "inactive"}
            onChange={(e) => onChange("status", e.target.value === "active")}
            disabled={saving}
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </div>
    </>
  );
};

export default CustomerModalFields;
