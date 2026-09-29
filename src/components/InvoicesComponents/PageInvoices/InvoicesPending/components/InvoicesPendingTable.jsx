import styles from "../InvoicesPending.module.css";

import {
  formatCurrency,
  formatDateTime,
  getShortFolio,
} from "../../../utils/invoiceFormatters";
import {
  getPendingSaleCashier,
  getPendingSaleCustomerName,
  isSaleReadyToInvoice,
} from "../services/invoicesPendingCalculationService";

const COL_SPAN = 8;

const buildStatusClass = (isReady) =>
  `${styles.statusBadge} ${
    isReady ? styles.statusReady : styles.statusMissing
  }`;

const InvoicesPendingRow = ({ sale, onInvoice }) => {
  const isReady = isSaleReadyToInvoice(sale);
  const customer = sale.customers;

  return (
    <tr>
      <td className={styles.folioCell}>{getShortFolio(sale)}</td>
      <td>{formatDateTime(sale.sale_date)}</td>
      <td>{getPendingSaleCustomerName(sale)}</td>
      <td>{customer?.rfc || "SIN RFC"}</td>
      <td>{getPendingSaleCashier(sale).toUpperCase()}</td>
      <td className={styles.totalCell}>{formatCurrency(sale.total)}</td>
      <td>
        <span className={buildStatusClass(isReady)}>
          {isReady ? "Listo" : "Faltan datos"}
        </span>
      </td>
      <td>
        <button
          type="button"
          className={styles.invoiceButton}
          onClick={() => onInvoice(sale)}
          title={
            isReady ? "Facturar venta" : "Seleccionar o crear cliente fiscal"
          }
        >
          Facturar
        </button>
      </td>
    </tr>
  );
};

/**
 * Tabla de ventas completadas sin factura asociada.
 */
const InvoicesPendingTable = ({ sales, loading, onInvoice }) => {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.salesTable}>
        <thead>
          <tr>
            <th>Folio</th>
            <th>Fecha</th>
            <th>Cliente fiscal</th>
            <th>RFC</th>
            <th>Cajero</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={COL_SPAN} className={styles.textCenter}>
                Cargando ventas...
              </td>
            </tr>
          ) : sales.length === 0 ? (
            <tr>
              <td colSpan={COL_SPAN} className={styles.textCenter}>
                No hay ventas pendientes por facturar.
              </td>
            </tr>
          ) : (
            sales.map((sale) => (
              <InvoicesPendingRow
                key={sale.id}
                sale={sale}
                onInvoice={onInvoice}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InvoicesPendingTable;
