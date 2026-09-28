import styles from "./RewardsAvailability.module.css";

/**
 * Resumen del cliente seleccionado: datos de contacto, puntos disponibles y
 * conteo de recompensas alcanzables.
 */
const RewardsAvailabilityCustomerSummary = ({
  selectedCustomer,
  customerPoints,
  loadingPoints,
  rewardsStats,
}) => {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Cliente seleccionado</h2>
        <p>Puntos disponibles y resumen de recompensas.</p>
      </div>

      {!selectedCustomer ? (
        <div className={styles.emptyCustomer}>
          Selecciona un cliente para ver sus puntos.
        </div>
      ) : (
        <>
          <div className={styles.selectedCustomerCard}>
            <div>
              <h3>{selectedCustomer.name || "SIN NOMBRE"}</h3>
              <p>Teléfono: {selectedCustomer.phone || "SIN TELÉFONO"}</p>
              <p>Correo: {selectedCustomer.email || "SIN CORREO"}</p>

              {selectedCustomer.is_billing_customer && (
                <p>
                  Datos fiscales:{" "}
                  <strong>
                    {selectedCustomer.razon_social ||
                      selectedCustomer.rfc ||
                      "REGISTRADOS"}
                  </strong>
                </p>
              )}
            </div>

            <div className={styles.pointsBox}>
              <span>Puntos disponibles</span>
              <strong>
                {loadingPoints ? "..." : Number(customerPoints || 0)}
              </strong>
            </div>
          </div>

          <div className={styles.customerStats}>
            <div className={styles.statBox}>
              <span>Puede canjear</span>
              <strong>{rewardsStats.available}</strong>
            </div>

            <div className={styles.statBox}>
              <span>No alcanza</span>
              <strong>{rewardsStats.unavailable}</strong>
            </div>

            <div className={styles.statBox}>
              <span>Recompensas activas</span>
              <strong>{rewardsStats.total}</strong>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default RewardsAvailabilityCustomerSummary;
