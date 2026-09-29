import styles from "../InvoicesHistory.module.css";

import {
  formatCurrency,
  formatDateTime,
  getBranchLabel,
  getInvoiceFolio,
  getInvoiceStatusLabel,
} from "../../../utils/invoiceFormatters";

const buildStatusClass = (styles, invoice) =>
  [
    styles.statusBadge,
    invoice.is_canceled
      ? styles.statusCanceled
      : invoice.uuid
        ? styles.statusStamped
        : styles.statusInternal,
  ].join(" ");

const buildRow = (invoice, isGlobalView, onView) => (
  <tr key={invoice.id}>
    <td className={styles.folioCell}>{getInvoiceFolio(invoice)}</td>

    <td>{formatDateTime(invoice.created_at)}</td>

    {isGlobalView && <td>{getBranchLabel(invoice.branches)}</td>}

    <td>{invoice.customers?.rfc || "SIN RFC"}</td>

    <td className={styles.customerCell}>
      {invoice.customers?.razon_social || "SIN RAZÓN SOCIAL"}
    </td>

    <td>{invoice.cfdi_use || "—"}</td>

    <td className={styles.totalCell}>{formatCurrency(invoice.total)}</td>

    <td>
      <span className={buildStatusClass(styles, invoice)}>
        {getInvoiceStatusLabel(invoice)}
      </span>
    </td>

    <td>
      <button
        type="button"
        className={styles.viewButton}
        onClick={() => onView(invoice)}
      >
        Ver
      </button>
    </td>
  </tr>
);

/**
 * Tabla del historial. La columna de sucursal solo aparece en la vista global.
 */
const InvoicesHistoryTable = ({
  invoices,
  isGlobalView,
  tableColSpan,
  loading,
  onViewInvoice,
}) => {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.invoicesTable}>
        <thead>
          <tr>
            <th>Folio</th>
            <th>Fecha</th>
            {isGlobalView && <th>Sucursal</th>}
            <th>RFC</th>
            <th>Razón social</th>
            <th>Uso CFDI</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={tableColSpan} className={styles.textCenter}>
                Cargando facturas...
              </td>
            </tr>
          ) : invoices.length === 0 ? (
            <tr>
              <td colSpan={tableColSpan} className={styles.textCenter}>
                No se encontraron facturas para los filtros seleccionados.
              </td>
            </tr>
          ) : (
            invoices.map((invoice) =>
              buildRow(invoice, isGlobalView, onViewInvoice)
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InvoicesHistoryTable;
