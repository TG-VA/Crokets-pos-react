import styles from "../PointsAdjustment.module.css";

/**
 * Aviso de uso administrativo y sucursal vigente del movimiento.
 */
const PointsAdjustmentAdminNotice = ({ branch }) => {
  return (
    <div className={styles.adminNotice}>
      <div>
        <strong>Uso administrativo</strong>
        <p>
          Solo para migración, correcciones autorizadas o aclaraciones. Todo
          movimiento quedará registrado con usuario, sucursal y motivo.
        </p>
      </div>

      <div className={styles.branchNotice}>
        <span>Sucursal actual</span>
        <strong>{branch?.name || branch?.code || "SIN SUCURSAL"}</strong>
      </div>
    </div>
  );
};

/**
 * Busqueda de clientes activos con sus resultados.
 */
const PointsAdjustmentCustomerSearchCard = ({
  searchTerm,
  customers,
  searchingCustomers,
  selectedCustomer,
  onSearchChange,
  onSearch,
  onSelectCustomer,
  onClearSearch,
}) => {
  return (
    <section className={styles.card}>
      <h2>Buscar cliente</h2>
      <p>
        Busca por nombre, teléfono o correo. Solo se muestran clientes activos.
      </p>

      <div className={styles.searchRow}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar cliente activo..."
            className={styles.searchInput}
          />

          {searchTerm && (
            <button
              type="button"
              className={styles.clearSearchButton}
              onClick={onClearSearch}
            >
              ×
            </button>
          )}
        </div>

        <button
          type="button"
          className={styles.searchButton}
          onClick={onSearch}
          disabled={searchingCustomers}
        >
          {searchingCustomers ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {(searchingCustomers || searchTerm.trim().length >= 2) && (
        <div className={styles.resultsBox}>
          {searchingCustomers ? (
            <div className={styles.emptyState}>Buscando clientes...</div>
          ) : customers.length === 0 ? (
            <div className={styles.emptyState}>
              No hay clientes activos para mostrar.
            </div>
          ) : (
            customers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className={`${styles.customerResult} ${
                  selectedCustomer?.id === customer.id
                    ? styles.customerSelected
                    : ""
                }`}
                onClick={() => onSelectCustomer(customer)}
              >
                <strong>{customer.name || "SIN NOMBRE"}</strong>
                <span>Tel: {customer.phone || "SIN TELÉFONO"}</span>
                <span>{customer.email || "SIN CORREO"}</span>
              </button>
            ))
          )}
        </div>
      )}
    </section>
  );
};

/**
 * Resumen del cliente elegido con su saldo actual de puntos.
 */
const PointsAdjustmentSelectedCustomerCard = ({
  selectedCustomer,
  currentPoints,
  loadingPoints,
}) => {
  return (
    <section className={styles.card}>
      <h2>Cliente seleccionado</h2>
      <p>Saldo actual de puntos.</p>

      {!selectedCustomer ? (
        <div className={styles.selectedEmpty}>
          Selecciona un cliente activo para realizar un ajuste.
        </div>
      ) : (
        <div className={styles.selectedCustomer}>
          <div>
            <h3>{selectedCustomer.name || "SIN NOMBRE"}</h3>
            <p>Teléfono: {selectedCustomer.phone || "SIN TELÉFONO"}</p>
            <p>Correo: {selectedCustomer.email || "SIN CORREO"}</p>
          </div>

          <div className={styles.pointsBox}>
            <span>PUNTOS ACTUALES</span>
            <strong>{loadingPoints ? "..." : currentPoints}</strong>
          </div>
        </div>
      )}
    </section>
  );
};

export {
  PointsAdjustmentAdminNotice,
  PointsAdjustmentCustomerSearchCard,
  PointsAdjustmentSelectedCustomerCard,
};
