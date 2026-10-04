import styles from "../InvoiceSettings.module.css";

/**
 * Credenciales del proveedor de timbrado. Los campos son de tipo password y el
 * valor nunca se muestra en logs.
 */
const InvoiceSettingsCredentialsSection = ({ form, onChange }) => {
  return (
    <section className={styles.section}>
      <h2>Credenciales del proveedor</h2>

      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label>Usuario API</label>
          <input
            name="api_username"
            value={form.api_username}
            onChange={onChange}
            className={styles.input}
            autoComplete="off"
          />
        </div>

        <div className={styles.field}>
          <label>Contraseña API</label>
          <input
            name="api_password"
            type="password"
            value={form.api_password}
            onChange={onChange}
            className={styles.input}
            autoComplete="new-password"
          />
        </div>

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label>Token API</label>
          <input
            name="api_token"
            type="password"
            value={form.api_token}
            onChange={onChange}
            className={styles.input}
            autoComplete="new-password"
          />
          <small>
            Se utilizará después para conectar el sistema con el PAC.
          </small>
        </div>
      </div>
    </section>
  );
};

export default InvoiceSettingsCredentialsSection;
