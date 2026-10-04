import styles from "../InvoiceCustomers.module.css";

import { formatCustomerStatus } from "../services/invoiceCustomersCalculationService";

/**
 * Aviso de coincidencia: el telefono buscado ya existe como cliente de puntos y
 * se puede completar sin duplicar el registro.
 */
const InvoiceCustomersPointsMatch = ({
  customer,
  searching,
  title,
  onAddAsFiscalCustomer,
}) => {
  if (searching) {
    return (
      <div className={styles.infoMessage}>
        Buscando coincidencias de clientes por teléfono...
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className={styles.pointsMatchCard}>
      <div className={styles.pointsMatchInfo}>
        <h3>{title}</h3>

        <p>
          Este teléfono ya existe en el módulo de clientes. Puedes agregarle
          datos fiscales sin duplicarlo.
        </p>

        <div className={styles.pointsDataGrid}>
          <div>
            <span>Nombre</span>
            <strong>{customer.name || "SIN NOMBRE"}</strong>
          </div>

          <div>
            <span>Teléfono</span>
            <strong>{customer.phone || "SIN TELÉFONO"}</strong>
          </div>

          <div>
            <span>Correo</span>
            <strong>{customer.email || "SIN CORREO"}</strong>
          </div>

          <div>
            <span>Estado</span>
            <strong>{formatCustomerStatus(customer.status)}</strong>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.linkPointsButton}
        onClick={onAddAsFiscalCustomer}
      >
        Agregar datos fiscales
      </button>
    </div>
  );
};

export default InvoiceCustomersPointsMatch;
