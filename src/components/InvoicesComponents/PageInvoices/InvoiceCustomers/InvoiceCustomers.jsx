import React, { useEffect, useMemo, useState } from "react";
import styles from "./InvoiceCustomers.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import { useAuth } from "../../../../contexts/AuthContext";
import { useBranch } from "../../../../contexts/BranchContext";
import { checkUserIsAdmin } from "../../../../lib/permissionsService";
import FiscalCustomerModal from "../../Modals/FiscalCustomerModal/FiscalCustomerModal";
import AdminAuthorizationModal from "../../../AdminAuthorizationModal/AdminAuthorizationModal";

const InvoiceCustomers = () => {
  const { user } = useAuth();
  const { branch } = useBranch();

  const [customers, setCustomers] = useState([]);
  const [cfdiUses, setCfdiUses] = useState([]);
  const [taxRegimes, setTaxRegimes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [error, setError] = useState("");
  const [isFiscalModalOpen, setIsFiscalModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [adminAuthOpen, setAdminAuthOpen] = useState(false);
  const [pendingDeactivateCustomer, setPendingDeactivateCustomer] =
    useState(null);

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
          .select("id, description")
          .eq("status", true)
          .order("id", { ascending: true }),
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

  useEffect(() => {
    const channel = supabase
      .channel("invoice-customers-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customers",
        },
        (payload) => {
          const newRow = payload.new;
          const oldRow = payload.old;

          const affectsBillingCustomers =
            newRow?.is_billing_customer === true ||
            oldRow?.is_billing_customer === true;

          if (affectsBillingCustomers) {
            loadCustomers();
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Realtime activo: clientes fiscales");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
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
      map[item.id] = item.description;
    }

    return map;
  }, [taxRegimes]);

  const filteredCustomers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && customer.status !== false) ||
        (statusFilter === "inactive" && customer.status === false);

      if (!matchesStatus) return false;

      if (!search) return true;

      const values = [
        customer.rfc,
        customer.razon_social,
        customer.phone,
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
  }, [customers, searchTerm, statusFilter]);

  const handleNewCustomer = () => {
    setEditingCustomer(null);
    setIsFiscalModalOpen(true);
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setIsFiscalModalOpen(true);
  };

  const handleCloseFiscalModal = () => {
    setIsFiscalModalOpen(false);
    setEditingCustomer(null);
  };

  const updateCustomerStatus = async (customer, nextStatus) => {
    const confirmed = window.confirm(
      `¿Seguro que deseas ${
        nextStatus ? "activar" : "desactivar"
      } este cliente fiscal?`
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

  const handleToggleStatus = async (customer) => {
    const nextStatus = customer.status === false;

    if (nextStatus) {
      await updateCustomerStatus(customer, true);
      return;
    }

    const isAdmin = await checkUserIsAdmin(user?.id);

    if (isAdmin) {
      await updateCustomerStatus(customer, false);
      return;
    }

    setPendingDeactivateCustomer(customer);
    setAdminAuthOpen(true);
  };

  const handleAdminAuthorizedDeactivate = async () => {
    if (!pendingDeactivateCustomer) {
      setAdminAuthOpen(false);
      return;
    }

    const customerToDeactivate = pendingDeactivateCustomer;

    setAdminAuthOpen(false);
    setPendingDeactivateCustomer(null);

    await updateCustomerStatus(customerToDeactivate, false);
  };

  const handleCloseAdminAuth = () => {
    setAdminAuthOpen(false);
    setPendingDeactivateCustomer(null);
  };

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>CLIENTES FISCALES</h1>
          <p>
            Administra los clientes que cuentan con información fiscal para
            emitir CFDI.
          </p>
        </div>

        <button
          type="button"
          className={styles.newButton}
          onClick={handleNewCustomer}
        >
          + Agregar datos fiscales
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Buscar por RFC, razón social, teléfono o correo..."
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

        <select
          className={styles.statusFilter}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>

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
            {loadingCustomers ? (
              <tr>
                <td colSpan="9" className={styles.textCenter}>
                  Cargando clientes fiscales...
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="9" className={styles.textCenter}>
                  No hay clientes fiscales registrados con los filtros
                  seleccionados.
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
                        className={`${styles.actionButton} ${styles.editButton}`}
                        onClick={() => handleEditCustomer(customer)}
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

      <FiscalCustomerModal
        isOpen={isFiscalModalOpen}
        onClose={handleCloseFiscalModal}
        onSaved={loadCustomers}
        customerToEdit={editingCustomer}
      />

      <AdminAuthorizationModal
        isOpen={adminAuthOpen}
        onClose={handleCloseAdminAuth}
        onAuthorized={handleAdminAuthorizedDeactivate}
        action="deactivate_fiscal_customer"
        title="Acceso restringido"
        message={
          pendingDeactivateCustomer
            ? `Para desactivar al cliente fiscal "${
                pendingDeactivateCustomer.razon_social ||
                pendingDeactivateCustomer.rfc ||
                "seleccionado"
              }", se requiere autorización de un administrador.`
            : "Para desactivar este cliente fiscal, se requiere autorización de un administrador."
        }
        targetId={pendingDeactivateCustomer?.id || null}
        branchId={branch?.id || null}
      />
    </div>
  );
};

export default InvoiceCustomers;