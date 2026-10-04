import styles from "../FiscalCustomerModal.module.css";
import { getFiscalInputClass } from "../utils/fiscalCustomerViewUtils";

/**
 * Codigo postal fiscal contra el catalogo SEPOMEX, con sus estados de carga,
 * coincidencia y error.
 */
const FiscalCustomerPostalCodeField = ({
  fieldStatus,
  form,
  onChange,
  postalError,
  postalInfo,
  postalLoading,
  touched,
}) => (
  <div className={styles.field}>
    <label>Código postal fiscal *</label>
    <input
      className={getFiscalInputClass(styles, "postal_code", {
        form,
        touched,
        status: fieldStatus,
      })}
      value={form.postal_code}
      onChange={(event) => onChange("postal_code", event.target.value)}
      maxLength={5}
    />

    {postalLoading && (
      <small className={styles.helpText}>Validando código postal...</small>
    )}

    {postalInfo && (
      <small className={styles.validHelp}>
        {postalInfo.city ? `${postalInfo.city}, ` : ""}
        {postalInfo.municipality}, {postalInfo.state}
      </small>
    )}

    {postalError && <small className={styles.fieldError}>{postalError}</small>}

    {!postalLoading &&
      !postalInfo &&
      !postalError &&
      fieldStatus.postal_code === "invalid" && (
        <small className={styles.fieldError}>
          El código postal debe tener 5 dígitos.
        </small>
      )}

    <small className={styles.helpText}>
      Debe coincidir con el código postal registrado ante el SAT.
    </small>
  </div>
);

export default FiscalCustomerPostalCodeField;
