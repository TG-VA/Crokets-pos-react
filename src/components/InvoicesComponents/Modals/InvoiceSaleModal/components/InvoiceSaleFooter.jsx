import styles from "../InvoiceSaleModal.module.css";

/**
 * Acciones de cierre y generacion de la factura interna.
 */
const InvoiceSaleFooter = ({ onCancel, onSave, saveDisabled, saving }) => (
  <div className={styles.footer}>
    <button
      type="button"
      className={styles.cancelButton}
      onClick={onCancel}
      disabled={saving}
    >
      Cancelar
    </button>

    <button
      type="button"
      className={styles.saveButton}
      onClick={onSave}
      disabled={saveDisabled}
    >
      {saving ? "Generando..." : "Generar factura interna"}
    </button>
  </div>
);

export default InvoiceSaleFooter;
