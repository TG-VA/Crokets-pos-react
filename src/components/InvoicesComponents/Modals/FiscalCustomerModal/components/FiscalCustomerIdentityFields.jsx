import styles from "../FiscalCustomerModal.module.css";
import { getFiscalInputClass } from "../utils/fiscalCustomerViewUtils";

/**
 * Identificacion del cliente fiscal: telefono, correo fiscal, RFC y razon social.
 * Solo presenta el estado de marca que recibe del hook.
 */
const FiscalCustomerIdentityFields = ({
  fieldStatus,
  form,
  onChange,
  touched,
}) => {
  const inputClass = (field) =>
    getFiscalInputClass(styles, field, { form, touched, status: fieldStatus });

  return (
    <>
      <div className={styles.field}>
        <label>Teléfono *</label>
        <input
          className={inputClass("phone")}
          value={form.phone}
          onChange={(event) => onChange("phone", event.target.value)}
          maxLength={10}
        />
        {fieldStatus.phone === "invalid" && (
          <small className={styles.fieldError}>
            El teléfono debe tener 10 dígitos.
          </small>
        )}
      </div>

      <div className={styles.field}>
        <label>Correo fiscal *</label>
        <input
          className={inputClass("fiscal_email")}
          value={form.fiscal_email}
          onChange={(event) => onChange("fiscal_email", event.target.value)}
        />
        {fieldStatus.fiscal_email === "invalid" && (
          <small className={styles.fieldError}>
            Ingresa un correo fiscal válido.
          </small>
        )}
      </div>

      <div className={styles.field}>
        <label>RFC *</label>
        <input
          className={inputClass("rfc")}
          value={form.rfc}
          onChange={(event) => onChange("rfc", event.target.value)}
          maxLength={13}
        />
        {fieldStatus.rfc === "invalid" && (
          <small className={styles.fieldError}>
            RFC inválido. Debe tener 12 o 13 caracteres.
          </small>
        )}
        <small className={styles.helpText}>
          Captúralo exactamente como aparece en la Constancia de Situación
          Fiscal.
        </small>
      </div>

      <div className={styles.field}>
        <label>Razón social *</label>
        <input
          className={inputClass("razon_social")}
          value={form.razon_social}
          onChange={(event) => onChange("razon_social", event.target.value)}
        />
      </div>
    </>
  );
};

export default FiscalCustomerIdentityFields;
