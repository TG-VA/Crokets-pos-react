import styles from "../InvoiceCustomers.module.css";

import { formatCustomerStatus } from "../services/invoiceCustomersCalculationService";

const COL_SPAN = 9;

const buildActionClass = (styles, isInactive) =>
  [
    styles.actionButton,
    isInactive ? styles.activateButton : styles.deactivateButton,
  ]
    .filter(Boolean)
    .join(" ");

const buildStatusClass = (styles, isInactive) =>
  [styles.statusBadge, isInactive ? styles.statusInactive : styles.statusActive]
    .filter(Boolean)
    .join(" ");

/**
 * Tabla de clientes fiscales: RFC, razon social, contacto, catalogos del SAT,
 * estado y acciones.
 */
const InvoiceCustomersTable = ({
  customers,
  cfdiUseMap,
  taxRegimeMap,
  loadingCustomers,
  onEditCustomer,
  onToggleStatus,
}) => {
  if (loadingCustomers) {
    return (
      <div className={styles.tableContainer}>
        <table className={styles.customersTable}>
          <tbody>
            <tr>
              <td colSpan={COL_SPAN} className={styles.textCenter}>
                Cargando clientes fiscales...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <table className={styles.customersTable}>
          <tbody>
            <tr>
              <td colSpan={COL_SPAN} className={styles.textCenter}>
                No hay clientes fiscales registrados con los filtros
                seleccionados.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.customersTable}>
        <thead>
          <tr>
            <th>RFC</th>
            <th>Razón Social</th>
            <th>Teléfono</th>
            <th>Correo Fiscal</th>
            <th>Código Postal</th>
            <th>Régimen Fiscal</th>
            <th>Uso CFDI</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {customers.map((customer) => {
            const isInactive = customer.status === false;

            return (
              <tr key={customer.id}>
                <td className={styles.rfcCell}>{customer.rfc || "SIN RFC"}</td>

                <td>
                  <div className={styles.businessName}>
                    {customer.razon_social || "SIN RAZÓN SOCIAL"}
                  </div>
                </td>

                <td>{customer.phone || "SIN TELÉFONO"}</td>

                <td>
                  {customer.fiscal_email || customer.email || "SIN CORREO"}
                </td>

                <td>{customer.postal_code || "—"}</td>

                <td>
                  <div className={styles.catalogCode}>
                    {customer.tax_regime || "—"}
                  </div>
                  <div className={styles.catalogDescription}>
                    {taxRegimeMap[customer.tax_regime] || ""}
                  </div>
                </td>

                <td>
                  <div className={styles.catalogCode}>
                    {customer.cfdi_use || "—"}
                  </div>
                  <div className={styles.catalogDescription}>
                    {cfdiUseMap[customer.cfdi_use] || ""}
                  </div>
                </td>

                <td>
                  <span className={buildStatusClass(styles, isInactive)}>
                    {formatCustomerStatus(customer.status)}
                  </span>
                </td>

                <td>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={`${styles.actionButton} ${styles.editButton}`}
                      onClick={() => onEditCustomer(customer)}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className={buildActionClass(styles, isInactive)}
                      onClick={() => onToggleStatus(customer)}
                    >
                      {isInactive ? "Activar" : "Desactivar"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default InvoiceCustomersTable;
