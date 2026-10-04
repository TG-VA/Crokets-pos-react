import styles from "../RewardsAvailability.module.css";

/**
 * Buscador de clientes activos con resultados desplegables.
 */
const RewardsAvailabilityCustomerSearch = ({
  customerSearch,
  customerResults,
  selectedCustomer,
  loadingCustomers,
  onSearchChange,
  onManualSearch,
  onClear,
  onSelectCustomer,
}) => {
  const showResults = !!loadingCustomers || customerSearch.trim().length >= 2;

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Buscar cliente</h2>
        <p>
          Busca por nombre, teléfono o correo. Solo se muestran clientes
          activos.
        </p>
      </div>

      <div className={styles.searchRow}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar cliente activo..."
            value={customerSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onManualSearch();
              }
            }}
          />

          {customerSearch && (
            <button
              type="button"
              className={styles.clearSearchButton}
              onClick={onClear}
            >
              ×
            </button>
          )}
        </div>

        <button
          type="button"
          className={styles.searchButton}
          onClick={onManualSearch}
          disabled={loadingCustomers}
        >
          {loadingCustomers ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {showResults && (
        <div className={styles.customerResults}>
          {loadingCustomers ? (
            <div className={styles.emptyState}>Buscando clientes...</div>
          ) : customerResults.length === 0 ? (
            <div className={styles.emptyState}>
              No hay clientes activos para mostrar.
            </div>
          ) : (
            customerResults.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className={[
                  styles.customerCard,
                  selectedCustomer?.id === customer.id
                    ? styles.customerCardSelected
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onSelectCustomer(customer)}
              >
                <div>
                  <strong>{customer.name || "SIN NOMBRE"}</strong>
                  <span>Tel: {customer.phone || "SIN TELÉFONO"}</span>
                  <span>{customer.email || "SIN CORREO"}</span>
                </div>

                {customer.is_billing_customer && (
                  <small className={styles.fiscalBadge}>FISCAL</small>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </section>
  );
};

export default RewardsAvailabilityCustomerSearch;
