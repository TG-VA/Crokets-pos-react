import styles from "../InvoiceSaleModal.module.css";
import { formatCurrency } from "../../../utils/invoiceFormatters";

/**
 * Totales de la venta a facturar y acciones del modal.
 */
const InvoiceSaleSummary = ({ subtotal, tax, total }) => (
  <section className={styles.summary}>
    <div>
      <span>Subtotal</span>
      <strong>{formatCurrency(subtotal)}</strong>
    </div>

    <div>
      <span>IVA</span>
      <strong>{formatCurrency(tax)}</strong>
    </div>

    <div className={styles.totalBox}>
      <span>Total</span>
      <strong>{formatCurrency(total)}</strong>
    </div>
  </section>
);

export default InvoiceSaleSummary;
