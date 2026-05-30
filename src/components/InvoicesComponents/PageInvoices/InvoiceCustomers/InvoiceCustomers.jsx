import React, { useEffect, useMemo, useState } from "react";
import styles from "./InvoiceCustomers.module.css";
import { supabase } from "../../../../lib/supabaseClient";

const InvoiceCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [cfdiUses, setCfdiUses] = useState([]);
  const [taxRegimes, setTaxRegimes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [error, setError] = useState("");

  const formatStatus = (status) => (status === false ? "INACTIVO" : "ACTIVO");

  const loadCatalogs = async () => {
    try {
      const [cfdiRes, regimesRes] = await Promise.all([
        supabase
          .from("cfdi_uses")
          .select("id, description")
          .eq("status", true)
          .order("id", { ascending: true }),

        supabase
          .from("tax_regimes")
          .select("code, description")
          .eq("status", true)
          .order("code", { ascending: true }),
      ]);

      if (cfdiRes.error) throw cfdiRes.error;
      if (regimesRes.error) throw regimesRes.error;

      setCfdiUses(cfdiRes.data || []);
      setTaxRegimes(regimesRes.data || []);
    } catch (err) {
      console.error("Error cargando catálogos fiscales:", err);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      setError("");

      const { data, error: customersError } = await supabase
        .from("customers")
        .select(`
          id,
          name,
          phone,
          email,
          fiscal_email,
          rfc,
          address,
          razon_social,
          postal_code,
          tax_regime,
          cfdi_use,
          status,
          is_billing_customer,
          created_at,
          updated_at
        `)
        .eq("is_billing_customer", true)
        .order("razon_social", { ascending: true });

      if (customersError) throw customersError;

      setCustomers(data || []);
    } catch (err) {
      console.error("Error cargando clientes fiscales:", err);
      setError("No se pudieron cargar los clientes fiscales.");
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    loadCatalogs();
    loadCustomers();
  }, []);

  const cfdiUseMap = useMemo(() => {
    const map = {};
    for (const item of cfdiUses) {
      map[item.id] = item.description;
    }
    return map;
  }, [cfdiUses]);

  const taxRegimeMap = useMemo(() => {
    const map = {};
    for (const item of taxRegimes) {
      map[item.code] = item.description;
    }
    return map;
  }, [taxRegimes]);

  const filteredCustomers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return customers;

    return customers.filter((customer) => {
      const values = [
        customer.rfc,
        customer.razon_social,
        customer.name,
        customer.fiscal_email,
        customer.email,
        customer.postal_code,
        customer.tax_regime,
        customer.cfdi_use,
      ];

      return values.some((value) =>
        String(value || "").toLowerCase().includes(search)
      );
    });
  }, [customers, searchTerm]);

  const handleNewCustomer = () => {
    alert("Aquí abriremos el modal para crear cliente fiscal.");
  };

  const handleEditCustomer = (customer) => {
    alert(`Aquí editaremos el cliente fiscal ${customer.rfc || customer.name}.`);
  };

  const handleToggleStatus = async (customer) => {
    const nextStatus = customer.status === false;

    const confirmed = window.confirm(
      `¿Seguro que deseas ${nextStatus ? "activar" : "desactivar"} este cliente fiscal?`
    );

    if (!confirmed) return;

    try {
      const { error: updateError } = await supabase
        .from("customers")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customer.id);

      if (updateError) throw updateError;

      await loadCustomers();
    } catch (err) {
      console.error("Error actualizando cliente fiscal:", err);
      alert("No se pudo actualizar el estado del cliente fiscal.");
    }
  };

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>CLIENTES FISCALES</h1>
          <p>Administra clientes con datos fiscales para emitir CFDI.</p>
        </div>

        <button
          type="button"
          className={styles.newButton}
          onClick={handleNewCustomer}
        >
          + Nuevo cliente fiscal
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Buscar por RFC, razón social, nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />

          {searchTerm && (
            <button
              type="button"
              className={styles.clearSearchButton}
              onClick={() => setSearchTerm("")}
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={loadCustomers}
          disabled={loadingCustomers}
        >
          {loadingCustomers ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.resultsInfo}>
        {loadingCustomers
          ? "Cargando clientes fiscales..."
          : `Mostrando ${filteredCustomers.length} cliente${
              filteredCustomers.length !== 1 ? "s" : ""
            } fiscal${filteredCustomers.length !== 1 ? "es" : ""}`}
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.customersTable}>
          <thead>
            <tr>
              <th>RFC</th>
              <th>Razón Social</th>
              <th>Correo Fiscal</th>
              <th>Código Postal</th>
              <th>Régimen Fiscal</th>
              <th>Uso CFDI</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loadingCustomers ? (
              <tr>
                <td colSpan="8" className={styles.textCenter}>
                  Cargando clientes fiscales...
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="8" className={styles.textCenter}>
                  No hay clientes fiscales registrados.
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td className={styles.rfcCell}>
                    {customer.rfc || "SIN RFC"}
                  </td>

                  <td>
                    <div className={styles.businessName}>
                      {customer.razon_social || customer.name || "SIN NOMBRE"}
                    </div>
                    <div className={styles.customerName}>
                      {customer.name || ""}
                    </div>
                  </td>

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
                    <span
                      className={`${styles.statusBadge} ${
                        customer.status === false
                          ? styles.statusInactive
                          : styles.statusActive
                      }`}
                    >
                      {formatStatus(customer.status)}
                    </span>
                  </td>

                  <td>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.editButton}
                        onClick={() => handleEditCustomer(customer)}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className={
                          customer.status === false
                            ? styles.activateButton
                            : styles.deactivateButton
                        }
                        onClick={() => handleToggleStatus(customer)}
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
    </div>
  );
};

export default InvoiceCustomers;