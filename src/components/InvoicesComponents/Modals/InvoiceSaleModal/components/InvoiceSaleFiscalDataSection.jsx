import styles from "../InvoiceSaleModal.module.css";

/**
 * Datos fiscales del cliente elegido, con el selector de uso CFDI de la factura
 * y la validacion del catalogo SEPOMEX del codigo postal.
 */
const InvoiceSaleFiscalDataSection = ({
  cfdiUses,
  onCfdiUseChange,
  postalInfo,
  postalLoading,
  selectedCfdiDescription,
  selectedCfdiUse,
  selectedCustomer,
  selectedCustomerReady,
}) => (
  <section className={styles.section}>
    <h3>Datos fiscales</h3>

    <div className={styles.infoGrid}>
      <div>
        <span>RFC</span>
        <strong>{selectedCustomer?.rfc || "SIN RFC"}</strong>
      </div>

      <div>
        <span>Razón social</span>
        <strong>{selectedCustomer?.razon_social || "SIN RAZÓN SOCIAL"}</strong>
      </div>

      <div>
        <span>Régimen fiscal</span>
        <strong>{selectedCustomer?.tax_regime || "SIN RÉGIMEN"}</strong>
      </div>

      <div>
        <span>Código postal</span>
        <strong>{selectedCustomer?.postal_code || "SIN CÓDIGO POSTAL"}</strong>

        {postalLoading && (
          <small className={styles.cfdiHelp}>Validando código postal...</small>
        )}

        {postalInfo && (
          <small className={styles.locationInfo}>
            {postalInfo.city ? `${postalInfo.city}, ` : ""}
            {postalInfo.municipality}, {postalInfo.state}
          </small>
        )}
      </div>

      <div>
        <span>Correo fiscal</span>
        <strong>
          {selectedCustomer?.fiscal_email ||
            selectedCustomer?.email ||
            "SIN CORREO"}
        </strong>
      </div>

      <div>
        <span>Uso CFDI para esta factura</span>
        <select
          className={styles.cfdiSelect}
          value={selectedCfdiUse}
          onChange={(event) => onCfdiUseChange(event.target.value)}
          disabled={!selectedCustomerReady}
        >
          <option value="">Selecciona uso CFDI</option>
          {cfdiUses.map((use) => (
            <option key={use.id} value={use.id}>
              {use.id} - {use.description}
            </option>
          ))}
        </select>

        {selectedCfdiDescription && (
          <small className={styles.cfdiHelp}>{selectedCfdiDescription}</small>
        )}
      </div>
    </div>

    {!selectedCustomerReady && (
      <div className={styles.warningBox}>
        Selecciona un cliente fiscal para poder generar la factura.
      </div>
    )}
  </section>
);

export default InvoiceSaleFiscalDataSection;
