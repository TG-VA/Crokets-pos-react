import styles from "../InvoicesHistory.module.css";
import XmarkIcon from "../../../../../assets/icons/xmark-solid-full.svg";

import {
  formatCurrency,
  getBranchLabel,
  getInvoiceFolio,
  getInvoiceStatusLabel,
} from "../../../utils/invoiceFormatters";

const FISCAL_FIELDS = [
  { label: "RFC", value: (invoice) => invoice.customers?.rfc || "SIN RFC" },
  {
    label: "Razón social",
    value: (invoice) => invoice.customers?.razon_social || "SIN RAZÓN SOCIAL",
  },
  {
    label: "Régimen fiscal",
    value: (invoice) => invoice.customers?.tax_regime || "SIN RÉGIMEN",
  },
  {
    label: "Código postal fiscal",
    value: (invoice) => invoice.customers?.postal_code || "SIN CÓDIGO POSTAL",
  },
  { label: "Uso CFDI", value: (invoice) => invoice.cfdi_use || "—" },
  {
    label: "Sucursal",
    value: (invoice) => getBranchLabel(invoice.branches),
  },
  {
    label: "Estado",
    value: (invoice) => getInvoiceStatusLabel(invoice),
  },
];

const ITEM_COL_SPAN = 7;

const InvoicesHistoryItems = ({ items }) => {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.itemsTable}>
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Clave SAT</th>
            <th>Cant.</th>
            <th>Precio</th>
            <th>Desc.</th>
            <th>IVA</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={ITEM_COL_SPAN} className={styles.textCenter}>
                No hay conceptos registrados.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td>{item.clave_prod_serv || "—"}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.unit_price)}</td>
                <td>{formatCurrency(item.discount)}</td>
                <td>{formatCurrency(item.tax_amount)}</td>
                <td>{formatCurrency(item.total)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Modal de detalle de una factura: datos fiscales, conceptos, totales y las
 * acciones que quedan pendientes de integrar con el PAC.
 */
const InvoicesHistoryDetail = ({ invoice, items, loading, onClose }) => {
  if (!invoice) return null;

  return (
    <div className={styles.detailOverlay}>
      <div className={styles.detailModal}>
        <div className={styles.detailHeader}>
          <div>
            <h2>Detalle de factura</h2>
            <p>Folio {getInvoiceFolio(invoice)}</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
          >
            <img
              src={XmarkIcon}
              alt=""
              className={styles.closeIcon}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className={styles.detailContent}>
          {loading ? (
            <div className={styles.textCenter}>
              Cargando detalle de factura...
            </div>
          ) : (
            <>
              <section className={styles.detailSection}>
                <h3>Datos fiscales</h3>

                <div className={styles.infoGrid}>
                  {FISCAL_FIELDS.map((field) => (
                    <div key={field.label}>
                      <span>{field.label}</span>
                      <strong>{field.value(invoice)}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.detailSection}>
                <h3>Conceptos</h3>

                <InvoicesHistoryItems items={items} />
              </section>

              <section className={styles.summary}>
                <div>
                  <span>Subtotal</span>
                  <strong>{formatCurrency(invoice.subtotal)}</strong>
                </div>

                <div>
                  <span>IVA</span>
                  <strong>{formatCurrency(invoice.tax)}</strong>
                </div>

                <div className={styles.totalBox}>
                  <span>Total</span>
                  <strong>{formatCurrency(invoice.total)}</strong>
                </div>
              </section>

              <section className={styles.disabledActions}>
                <button type="button" disabled>
                  Descargar PDF
                </button>
                <button type="button" disabled>
                  Descargar XML
                </button>
                <button type="button" disabled>
                  Cancelar CFDI
                </button>
                <small>
                  Estas acciones estarán disponibles cuando se integre
                  Facturama.
                </small>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoicesHistoryDetail;
