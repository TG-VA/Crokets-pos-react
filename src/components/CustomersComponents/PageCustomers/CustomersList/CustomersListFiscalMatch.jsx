import styles from "./CustomersList.module.css";

/**
 * Aviso de coincidencia fiscal: permite registrar un cliente ya existente en
 * clientes fiscales como cliente de puntos sin duplicarlo.
 */
const CustomersListFiscalMatch = ({
  fiscalCustomer,
  searching,
  onAddAsPointsCustomer,
}) => {
  if (searching) {
    return (
      <div className={styles.infoMessage}>
        Buscando coincidencias fiscales por teléfono...
      </div>
    );
  }

  if (!fiscalCustomer) return null;

  return (
    <div className={styles.fiscalMatchCard}>
      <div className={styles.fiscalMatchInfo}>
        <h3>Cliente fiscal encontrado</h3>

        <p>
          Este teléfono ya existe en clientes fiscales. Puedes agregarlo como
          cliente de puntos sin duplicarlo.
        </p>

        <div className={styles.fiscalDataGrid}>
          <div>
            <span>Razón social</span>
            <strong>
              {fiscalCustomer.razon_social ||
                fiscalCustomer.name ||
                "SIN RAZÓN SOCIAL"}
            </strong>
          </div>

          <div>
            <span>RFC</span>
            <strong>{fiscalCustomer.rfc || "SIN RFC"}</strong>
          </div>

          <div>
            <span>Teléfono</span>
            <strong>{fiscalCustomer.phone || "SIN TELÉFONO"}</strong>
          </div>

          <div>
            <span>Correo fiscal</span>
            <strong>
              {fiscalCustomer.fiscal_email ||
                fiscalCustomer.email ||
                "SIN CORREO"}
            </strong>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.linkFiscalButton}
        onClick={onAddAsPointsCustomer}
      >
        Agregar a clientes
      </button>
    </div>
  );
};

export default CustomersListFiscalMatch;
