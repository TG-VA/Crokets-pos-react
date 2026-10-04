import styles from "../FiscalCustomerModal.module.css";

import FiscalCustomerAddressField from "./FiscalCustomerAddressField";
import FiscalCustomerIdentityFields from "./FiscalCustomerIdentityFields";
import FiscalCustomerPostalCodeField from "./FiscalCustomerPostalCodeField";
import FiscalCustomerTaxFields from "./FiscalCustomerTaxFields";

/**
 * Rejilla del formulario fiscal y acciones de guardado.
 *
 * El orden de los campos reproduce el formulario original porque la rejilla es
 * de dos columnas y el bloque de direccion ocupa el ancho completo.
 */
const FiscalCustomerFormSection = ({
  cfdiUses,
  fieldStatus,
  form,
  onChange,
  onBack,
  onCancel,
  onSave,
  postalError,
  postalInfo,
  postalLoading,
  saveDisabled,
  saving,
  showBackButton,
  taxRegimes,
  touched,
}) => (
  <div className={styles.formSection}>
    <div className={styles.formGrid}>
      <FiscalCustomerIdentityFields
        fieldStatus={fieldStatus}
        form={form}
        onChange={onChange}
        touched={touched}
      />

      <FiscalCustomerPostalCodeField
        fieldStatus={fieldStatus}
        form={form}
        onChange={onChange}
        postalError={postalError}
        postalInfo={postalInfo}
        postalLoading={postalLoading}
        touched={touched}
      />

      <FiscalCustomerTaxFields
        cfdiUses={cfdiUses}
        fieldStatus={fieldStatus}
        form={form}
        onChange={onChange}
        taxRegimes={taxRegimes}
        touched={touched}
      />

      <FiscalCustomerAddressField form={form} onChange={onChange} />
    </div>

    <div className={styles.footer}>
      {showBackButton && (
        <button
          type="button"
          className={styles.backButton}
          onClick={onBack}
          disabled={saving}
        >
          Volver a búsqueda
        </button>
      )}

      <button
        type="button"
        className={styles.cancelButton}
        onClick={onCancel}
        disabled={saving}
      >
        Cancelar
      </button>

      <button
        type="button"
        className={styles.saveButton}
        onClick={onSave}
        disabled={saveDisabled}
      >
        {saving ? "Guardando..." : "Guardar datos fiscales"}
      </button>
    </div>
  </div>
);

export default FiscalCustomerFormSection;
