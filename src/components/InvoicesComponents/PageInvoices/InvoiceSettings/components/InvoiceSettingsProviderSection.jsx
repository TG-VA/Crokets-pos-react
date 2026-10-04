import styles from "../InvoiceSettings.module.css";

/**
 * Proveedor de timbrado y ambiente. Solo presenta: el estado y los handlers
 * llegan del hook de la pantalla.
 */
const InvoiceSettingsProviderSection = ({ form, onChange }) => {
  return (
    <section className={styles.section}>
      <h2>Proveedor de timbrado</h2>

      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label>Proveedor *</label>
          <select
            name="provider"
            value={form.provider}
            onChange={onChange}
            className={styles.input}
          >
            <option value="facturama">Facturama</option>
          </select>
        </div>

        <div className={styles.field}>
          <label>Ambiente *</label>
          <select
            name="environment"
            value={form.environment}
            onChange={onChange}
            className={styles.input}
          >
            <option value="sandbox">Sandbox / Pruebas</option>
            <option value="production">Producción</option>
          </select>
        </div>
      </div>
    </section>
  );
};

export default InvoiceSettingsProviderSection;
