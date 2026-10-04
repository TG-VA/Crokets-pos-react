import styles from "../FiscalCustomerModal.module.css";

/**
 * Busqueda de clientes candidatos antes de capturar datos fiscales.
 * Solo presenta: el estado y las consultas viven en `useFiscalCustomerModal`.
 */
const FiscalCustomerSearchSection = ({
  hasSearched,
  loadingSearch,
  matches,
  onCreateNew,
  onSearch,
  onSearchTermChange,
  onSelectCustomer,
  searchTerm,
}) => (
  <div className={styles.searchSection}>
    <label className={styles.label}>
      Buscar cliente por teléfono, correo, RFC o razón social
    </label>

    <div className={styles.searchRow}>
      <input
        type="text"
        className={styles.input}
        placeholder="Buscar por teléfono, RFC o correo..."
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSearch();
          }
        }}
      />

      <button
        type="button"
        className={styles.primaryButton}
        onClick={onSearch}
        disabled={loadingSearch}
      >
        {loadingSearch ? "Buscando..." : "Buscar"}
      </button>
    </div>

    <div className={styles.matchesContainer}>
      {matches.length > 0 ? (
        matches.map((customer) => (
          <div key={customer.id} className={styles.matchCard}>
            <div>
              <strong>
                {customer.razon_social || customer.name || "SIN NOMBRE"}
              </strong>
              <span>
                Tel: {customer.phone || "—"} · Correo:{" "}
                {customer.fiscal_email || customer.email || "—"}
              </span>
              <span>
                RFC: {customer.rfc || "SIN RFC"} ·{" "}
                {customer.is_billing_customer
                  ? "Ya tiene datos fiscales"
                  : "Sin datos fiscales"}
              </span>
            </div>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onSelectCustomer(customer)}
            >
              Seleccionar
            </button>
          </div>
        ))
      ) : hasSearched ? (
        <div className={styles.emptyState}>
          No se encontró ningún cliente con esa búsqueda. Puedes crear uno
          nuevo.
        </div>
      ) : (
        <div className={styles.emptyState}>
          Busca un cliente existente antes de crear uno nuevo.
        </div>
      )}
    </div>

    <button type="button" className={styles.createButton} onClick={onCreateNew}>
      + Crear cliente con datos fiscales
    </button>
  </div>
);

export default FiscalCustomerSearchSection;
