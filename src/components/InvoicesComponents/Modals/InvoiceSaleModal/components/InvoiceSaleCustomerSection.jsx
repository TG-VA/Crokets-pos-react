import styles from "../InvoiceSaleModal.module.css";

/**
 * Seccion de seleccion del cliente fiscal: muestra el cliente ya elegido o el
 * buscador con los clientes que el cajero puede elegir.
 */
const InvoiceSaleCustomerSection = ({
  filteredFiscalCustomers,
  loadingCustomers,
  onChangeCustomer,
  onCustomerSearchChange,
  onSelectCustomer,
  searchTerm,
  selectedCustomer,
  selectedCustomerReady,
}) => (
  <section className={styles.section}>
    <div className={styles.sectionHeader}>
      <div>
        <h3>Cliente fiscal</h3>
        <p>Selecciona el cliente fiscal que se usará para esta factura.</p>
      </div>
    </div>

    {selectedCustomerReady ? (
      <div className={styles.selectedCustomerBox}>
        <div>
          <span>Cliente seleccionado</span>
          <strong>{selectedCustomer.razon_social}</strong>
          <small>{selectedCustomer.rfc}</small>
        </div>

        <button
          type="button"
          className={styles.changeCustomerButton}
          onClick={onChangeCustomer}
        >
          Cambiar cliente
        </button>
      </div>
    ) : (
      <>
        <input
          type="text"
          className={styles.customerSearchInput}
          placeholder="Buscar por RFC, razón social, teléfono o correo..."
          value={searchTerm}
          onChange={(event) => onCustomerSearchChange(event.target.value)}
        />

        <div className={styles.customerList}>
          {loadingCustomers ? (
            <div className={styles.emptyState}>
              Cargando clientes fiscales...
            </div>
          ) : filteredFiscalCustomers.length === 0 ? (
            <div className={styles.emptyState}>
              No se encontraron clientes fiscales. Regístralo primero desde
              Clientes fiscales.
            </div>
          ) : (
            filteredFiscalCustomers.map((customer) => (
              <button
                type="button"
                key={customer.id}
                className={styles.customerCard}
                onClick={() => onSelectCustomer(customer)}
              >
                <strong>{customer.razon_social}</strong>
                <span>
                  RFC: {customer.rfc} · Tel: {customer.phone || "—"}
                </span>
                <span>
                  Correo: {customer.fiscal_email || customer.email || "—"}
                </span>
              </button>
            ))
          )}
        </div>
      </>
    )}
  </section>
);

export default InvoiceSaleCustomerSection;
