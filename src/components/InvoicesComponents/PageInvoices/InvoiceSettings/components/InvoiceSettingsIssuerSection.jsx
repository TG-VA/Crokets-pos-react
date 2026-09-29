import styles from "../InvoiceSettings.module.css";

/**
 * Datos fiscales del emisor: RFC, razón social, régimen y código postal.
 */
const InvoiceSettingsIssuerSection = ({
  form,
  taxRegimes,
  fieldValidity,
  postalInfo,
  postalLoading,
  postalError,
  onChange,
}) => {
  return (
    <section className={styles.section}>
      <h2>Datos fiscales del emisor</h2>

      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label>RFC emisor *</label>
          <input
            name="issuer_rfc"
            value={form.issuer_rfc}
            onChange={onChange}
            className={[
              styles.input,
              fieldValidity.issuerRfc ? styles.validInput : "",
            ]
              .filter(Boolean)
              .join(" ")}
            maxLength={13}
          />
          {form.issuer_rfc && !fieldValidity.issuerRfc && (
            <small className={styles.fieldError}>
              RFC inválido. Debe tener 12 o 13 caracteres con formato SAT.
            </small>
          )}
        </div>

        <div className={styles.field}>
          <label>Razón social emisor *</label>
          <input
            name="issuer_name"
            value={form.issuer_name}
            onChange={onChange}
            className={[
              styles.input,
              fieldValidity.issuerName ? styles.validInput : "",
            ]
              .filter(Boolean)
              .join(" ")}
            maxLength={255}
          />
          {form.issuer_name && !fieldValidity.issuerName && (
            <small className={styles.fieldError}>
              Debe tener mínimo 3 caracteres.
            </small>
          )}
        </div>

        <div className={styles.field}>
          <label>Régimen fiscal emisor *</label>
          <select
            name="issuer_tax_regime"
            value={form.issuer_tax_regime}
            onChange={onChange}
            className={[
              styles.input,
              form.issuer_tax_regime ? styles.validInput : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <option value="">Selecciona régimen fiscal</option>
            {taxRegimes.map((regime) => (
              <option key={regime.id} value={regime.id}>
                {regime.id} - {regime.description}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label>Código postal fiscal *</label>
          <input
            name="issuer_postal_code"
            value={form.issuer_postal_code}
            onChange={onChange}
            className={[
              styles.input,
              fieldValidity.postalCode ? styles.validInput : "",
            ]
              .filter(Boolean)
              .join(" ")}
            maxLength={5}
          />

          {postalLoading && <small>Validando código postal...</small>}

          {postalInfo && (
            <small className={styles.validHelp}>
              {postalInfo.city ? `${postalInfo.city}, ` : ""}
              {postalInfo.municipality}, {postalInfo.state}
            </small>
          )}

          {postalError && (
            <small className={styles.fieldError}>{postalError}</small>
          )}

          {form.issuer_postal_code &&
            form.issuer_postal_code.length < 5 &&
            !postalLoading && (
              <small className={styles.fieldError}>
                El código postal debe tener 5 dígitos.
              </small>
            )}

          <small>Debe coincidir con la Constancia de Situación Fiscal.</small>
        </div>
      </div>
    </section>
  );
};

export default InvoiceSettingsIssuerSection;
