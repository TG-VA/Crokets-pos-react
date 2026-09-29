import styles from "../FiscalCustomerModal.module.css";
import { getFiscalSelectClass } from "../utils/fiscalCustomerViewUtils";

/**
 * Regimen fiscal y uso de CFDI, alimentados por los catalogos que carga el hook.
 */
const FiscalCustomerTaxFields = ({
  cfdiUses,
  fieldStatus,
  form,
  onChange,
  taxRegimes,
  touched,
}) => {
  const selectClass = (field) =>
    getFiscalSelectClass(styles, field, { form, touched, status: fieldStatus });

  return (
    <>
      <div className={styles.field}>
        <label>Régimen fiscal *</label>
        <select
          className={selectClass("tax_regime")}
          value={form.tax_regime}
          onChange={(event) => onChange("tax_regime", event.target.value)}
        >
          <option value="">Selecciona régimen</option>
          {taxRegimes.map((regime) => (
            <option key={regime.id} value={regime.id}>
              {regime.id} - {regime.description}
            </option>
          ))}
        </select>
        <small className={styles.helpText}>
          Debe coincidir con el régimen indicado en la Constancia de Situación
          Fiscal.
        </small>
      </div>

      <div className={styles.field}>
        <div className={styles.labelWithHelp}>
          <label>Uso CFDI *</label>
          <span
            className={styles.tooltip}
            title="G03 = Gastos en general. S01 = Sin efectos fiscales. D01 = Honorarios médicos."
          >
            ⓘ
          </span>
        </div>

        <select
          className={selectClass("cfdi_use")}
          value={form.cfdi_use}
          onChange={(event) => onChange("cfdi_use", event.target.value)}
        >
          <option value="">Selecciona uso CFDI</option>
          {cfdiUses.map((use) => (
            <option key={use.id} value={use.id}>
              {use.id} - {use.description}
            </option>
          ))}
        </select>
      </div>
    </>
  );
};

export default FiscalCustomerTaxFields;
