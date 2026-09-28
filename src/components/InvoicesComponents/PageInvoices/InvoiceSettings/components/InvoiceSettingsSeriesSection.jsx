import styles from "../InvoiceSettings.module.css";

/**
 * Serie de facturacion y proximo folio.
 */
const InvoiceSettingsSeriesSection = ({ form, fieldValidity, onChange }) => {
  return (
    <section className={styles.section}>
      <h2>Serie y folios</h2>

      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label>Serie *</label>
          <input
            name="invoice_series"
            value={form.invoice_series}
            onChange={onChange}
            className={[
              styles.input,
              fieldValidity.series ? styles.validInput : "",
            ]
              .filter(Boolean)
              .join(" ")}
            maxLength={10}
          />
          {form.invoice_series && !fieldValidity.series && (
            <small className={styles.fieldError}>
              Solo letras y números. Máximo 10 caracteres.
            </small>
          )}
        </div>

        <div className={styles.field}>
          <label>Próximo folio *</label>
          <input
            name="next_folio"
            value={form.next_folio}
            onChange={onChange}
            className={[
              styles.input,
              fieldValidity.folio ? styles.validInput : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
          {form.next_folio && !fieldValidity.folio && (
            <small className={styles.fieldError}>Debe ser mayor a 0.</small>
          )}
        </div>
      </div>
    </section>
  );
};

export default InvoiceSettingsSeriesSection;
