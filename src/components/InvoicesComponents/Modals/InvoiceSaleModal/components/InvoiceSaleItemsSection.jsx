import styles from "../InvoiceSaleModal.module.css";
import { formatCurrency } from "../../../utils/invoiceFormatters";

/**
 * Conceptos de la venta que se van a facturar.
 */
const InvoiceSaleItemsSection = ({ loading, saleDetails }) => (
  <section className={styles.section}>
    <h3>Productos y servicios</h3>

    <div className={styles.tableContainer}>
      <table className={styles.itemsTable}>
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Cant.</th>
            <th>Precio</th>
            <th>Desc.</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan="5" className={styles.textCenter}>
                Cargando conceptos...
              </td>
            </tr>
          ) : saleDetails.length === 0 ? (
            <tr>
              <td colSpan="5" className={styles.textCenter}>
                No hay conceptos para facturar.
              </td>
            </tr>
          ) : (
            saleDetails.map((item) => (
              <tr key={item.id}>
                <td>{item.products?.name || "CONCEPTO FACTURADO"}</td>
                <td>{item.quantity}</td>
                <td>
                  {formatCurrency(item.final_unit_price || item.unit_price)}
                </td>
                <td>{formatCurrency(item.discount_amount || 0)}</td>
                <td>{formatCurrency(item.total_price)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </section>
);

export default InvoiceSaleItemsSection;
