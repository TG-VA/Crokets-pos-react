import styles from "../InvoiceSettings.module.css";

import { formatSettingsDateTime } from "../utils/invoiceSettingsFormatters";

/**
 * Timbres disponibles del PAC y accion de consulta.
 */
const InvoiceSettingsTimbresSection = ({
  form,
  syncingTimbres,
  saving,
  onSyncTimbres,
}) => {
  return (
    <section className={styles.section}>
      <h2>Timbres</h2>

      <div className={styles.infoCardsGrid}>
        <div className={styles.infoCard}>
          <span>Timbres disponibles</span>
          <strong>{Number(form.timbres_available || 0)}</strong>
        </div>

        <div className={styles.infoCard}>
          <span>Última sincronización</span>
          <strong>{formatSettingsDateTime(form.last_timbres_sync)}</strong>
        </div>

        <div className={styles.actionCard}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onSyncTimbres}
            disabled={syncingTimbres || saving}
          >
            {syncingTimbres ? "Consultando..." : "Consultar timbres"}
          </button>
          <small>Disponible cuando se conecte la API del proveedor.</small>
        </div>
      </div>
    </section>
  );
};

export default InvoiceSettingsTimbresSection;
