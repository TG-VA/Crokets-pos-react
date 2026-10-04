import styles from "../FiscalCustomerModal.module.css";

/**
 * Direccion fiscal del cliente. Ocupa el ancho completo de la rejilla.
 */
const FiscalCustomerAddressField = ({ form, onChange }) => (
  <div className={`${styles.field} ${styles.fullWidth}`}>
    <label>Dirección fiscal</label>
    <textarea
      className={styles.textarea}
      value={form.address}
      onChange={(event) => onChange("address", event.target.value)}
    />
  </div>
);

export default FiscalCustomerAddressField;
