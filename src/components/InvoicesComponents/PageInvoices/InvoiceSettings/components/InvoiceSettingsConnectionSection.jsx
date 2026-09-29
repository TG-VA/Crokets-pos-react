import styles from "../InvoiceSettings.module.css";

import { formatSettingsDateTime } from "../utils/invoiceSettingsFormatters";

/**
 * Estado de conexion con el PAC: ultima prueba y accion de prueba.
 */
const InvoiceSettingsConnectionSection = ({
  form,
  connectionState,
  testingConnection,
  saving,
  onTestConnection,
}) => {
  return (
    <section className={styles.section}>
      <h2>Estado de conexión</h2>

      <div className={styles.infoCardsGrid}>
        <div className={styles.infoCard}>
          <span>Estado actual</span>
          <strong className={connectionState.className}>
            {connectionState.label}
          </strong>
        </div>

        <div className={styles.infoCard}>
          <span>Última prueba</span>
          <strong>{formatSettingsDateTime(form.last_connection_test)}</strong>
        </div>

        <div className={styles.actionCard}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onTestConnection}
            disabled={testingConnection || saving}
          >
            {testingConnection ? "Probando..." : "Probar conexión"}
          </button>
          <small>Disponible cuando se conecte la API del proveedor.</small>
        </div>
      </div>
    </section>
  );
};

export default InvoiceSettingsConnectionSection;
