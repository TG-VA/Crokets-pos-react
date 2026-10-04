import styles from "../CustomersList.module.css";
import { formatCustomerStatus } from "../services/customersListCalculationService";

/**
 * Tabla de clientes de puntos con su saldo y acciones de edicion y estado.
 */
const CustomersListTable = ({
  customers,
  pointsByCustomer,
  loadingCustomers,
  onEditCustomer,
  onToggleStatus,
}) => {
  return (
    <>
      <div className={styles.resultsInfo}>
        {loadingCustomers
          ? "Cargando clientes..."
          : `Mostrando ${customers.length} cliente${
              customers.length !== 1 ? "s" : ""
            }`}
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.customersTable}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Puntos</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loadingCustomers ? (
              <tr>
                <td colSpan="7" className={styles.textCenter}>
                  Cargando clientes...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.textCenter}>
                  No hay clientes registrados con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className={styles.customerName}>
                      {customer.name || "SIN NOMBRE"}
                    </div>
                  </td>

                  <td>{customer.phone || "SIN TELÉFONO"}</td>

                  <td>{customer.email || "SIN CORREO"}</td>

                  <td>
                    <span className={styles.pointsBadge}>
                      {Number(pointsByCustomer[customer.id] || 0)}
                    </span>
                  </td>

                  <td>
                    <div className={styles.typeBadges}>
                      <span className={styles.pointsTypeBadge}>Puntos</span>

                      {customer.is_billing_customer === true && (
                        <span className={styles.fiscalTypeBadge}>Fiscal</span>
                      )}
                    </div>
                  </td>

                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        customer.status === false
                          ? styles.statusInactive
                          : styles.statusActive
                      }`}
                    >
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
                        className={`${styles.actionButton} ${
                          customer.status === false
                            ? styles.activateButton
                            : styles.deactivateButton
                        }`}
                        onClick={() => onToggleStatus(customer)}
                      >
                        {customer.status === false ? "Activar" : "Desactivar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default CustomersListTable;
