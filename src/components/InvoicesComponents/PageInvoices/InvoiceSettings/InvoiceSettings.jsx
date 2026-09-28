import styles from "./InvoiceSettings.module.css";
import AppModal from "../../../AppModal/AppModal";

import InvoiceSettingsProviderSection from "./components/InvoiceSettingsProviderSection";
import InvoiceSettingsIssuerSection from "./components/InvoiceSettingsIssuerSection";
import InvoiceSettingsSeriesSection from "./components/InvoiceSettingsSeriesSection";
import InvoiceSettingsCredentialsSection from "./components/InvoiceSettingsCredentialsSection";
import InvoiceSettingsConnectionSection from "./components/InvoiceSettingsConnectionSection";
import InvoiceSettingsTimbresSection from "./components/InvoiceSettingsTimbresSection";
import { useInvoiceSettings } from "./hooks/useInvoiceSettings";
import { getConnectionState } from "./services/invoiceSettingsCalculationService";
import { getSettingsEnvironmentLabel } from "./utils/invoiceSettingsFormatters";

const InvoiceSettings = () => {
  const {
    appModal,
    closeAppModal,
    error,
    fieldValidity,
    form,
    handleChange,
    handleSave,
    handleSyncTimbres,
    handleTestConnection,
    loadSettings,
    loading,
    postalError,
    postalInfo,
    postalLoading,
    saveDisabled,
    saving,
    successMessage,
    syncingTimbres,
    taxRegimes,
    testingConnection,
  } = useInvoiceSettings();

  return (
    <>
      <div className={styles.content}>
        <div className={styles.header}>
          <div>
            <h1>CONFIGURACIÓN CFDI</h1>
            <p>
              Configura los datos del emisor y el proveedor que se usará para
              timbrar facturas.
            </p>
          </div>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={loadSettings}
            disabled={loading || saving}
          >
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {successMessage && (
          <div className={styles.successMessage}>{successMessage}</div>
        )}

        <div className={styles.formWrapper}>
          <InvoiceSettingsProviderSection form={form} onChange={handleChange} />

          <InvoiceSettingsIssuerSection
            form={form}
            taxRegimes={taxRegimes}
            fieldValidity={fieldValidity}
            postalInfo={postalInfo}
            postalLoading={postalLoading}
            postalError={postalError}
            onChange={handleChange}
          />

          <InvoiceSettingsSeriesSection
            form={form}
            fieldValidity={fieldValidity}
            onChange={handleChange}
          />

          <InvoiceSettingsCredentialsSection
            form={form}
            onChange={handleChange}
          />

          <InvoiceSettingsConnectionSection
            form={form}
            connectionState={getConnectionState(form.connection_status, styles)}
            testingConnection={testingConnection}
            saving={saving}
            onTestConnection={handleTestConnection}
          />

          <InvoiceSettingsTimbresSection
            form={form}
            syncingTimbres={syncingTimbres}
            saving={saving}
            onSyncTimbres={handleSyncTimbres}
          />

          <section className={styles.statusSection}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="status"
                checked={form.status}
                onChange={handleChange}
              />
              Configuración activa
            </label>

            <div className={styles.connectionStatus}>
              Ambiente actual:{" "}
              <strong>{getSettingsEnvironmentLabel(form.environment)}</strong>
            </div>
          </section>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.saveButton}
              onClick={handleSave}
              disabled={saveDisabled}
            >
              {saving ? "Guardando..." : "Guardar configuración CFDI"}
            </button>
          </div>
        </div>
      </div>

      <AppModal
        isOpen={appModal.isOpen}
        type={appModal.type}
        title={appModal.title}
        message={appModal.message}
        confirmText={appModal.confirmText}
        cancelText={appModal.cancelText}
        showCancel={appModal.showCancel}
        loading={saving || appModal.loading}
        onConfirm={appModal.onConfirm || closeAppModal}
        onCancel={appModal.onCancel || closeAppModal}
        onClose={closeAppModal}
      />
    </>
  );
};

export default InvoiceSettings;
