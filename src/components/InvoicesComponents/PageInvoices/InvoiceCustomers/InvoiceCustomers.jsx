import React, { useEffect, useMemo, useState } from "react";
import styles from "./InvoiceCustomers.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import { useAuth } from "../../../../contexts/AuthContext";
import { useBranch } from "../../../../contexts/BranchContext";
import { checkUserIsAdmin } from "../../../../lib/permissionsService";
import FiscalCustomerModal from "../../Modals/FiscalCustomerModal/FiscalCustomerModal";
import AdminAuthorizationModal from "../../../AdminAuthorizationModal/AdminAuthorizationModal";
import AppModal from "../../../AppModal/AppModal";

const InvoiceCustomers = () => {
  const { user } = useAuth();
  const { branch } = useBranch();

  const [customers, setCustomers] = useState([]);
  const [cfdiUses, setCfdiUses] = useState([]);
  const [taxRegimes, setTaxRegimes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [searchingPointsCustomer, setSearchingPointsCustomer] = useState(false);
  const [pointsCustomerFound, setPointsCustomerFound] = useState(null);

  const [isFiscalModalOpen, setIsFiscalModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [adminAuthOpen, setAdminAuthOpen] = useState(false);
  const [pendingDeactivateCustomer, setPendingDeactivateCustomer] =
    useState(null);

  const [appModal, setAppModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "Entendido",
    cancelText: "Cancelar",
    showCancel: false,
    loading: false,
    onConfirm: null,
    onCancel: null,
  });

  const closeAppModal = () => {
    setAppModal((prev) => ({
      ...prev,
      isOpen: false,
      loading: false,
      onConfirm: null,
      onCancel: null,
    }));
  };

  const showAppAlert = ({
    type = "info",
    title = "Aviso",
    message = "",
    confirmText = "Entendido",
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText: "Cancelar",
      showCancel: false,
      loading: false,
      onConfirm: closeAppModal,
      onCancel: closeAppModal,
    });
  };

  const showAppConfirm = ({
    type = "warning",
    title = "Confirmar acción",
    message = "",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    onConfirm,
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      showCancel: true,
      loading: false,
      onConfirm: async () => {
        closeAppModal();

        if (onConfirm) {
          await onConfirm();
        }
      },
      onCancel: closeAppModal,
    });
  };

  const formatStatus = (status) => (status === false ? "INACTIVO" : "ACTIVO");

  const normalizePhone = (value) => {
    return String(value || "").replace(/\D/g, "").slice(0, 10);
  };

  const getCustomerSortName = (customer) => {
    return String(
      customer.razon_social ||
        customer.name ||
        customer.rfc ||
        "SIN RAZÓN SOCIAL"
    ).trim();
  };

  const getCustomerDisplayName = (customer) => {
    return (
      customer?.razon_social ||
      customer?.name ||
      customer?.rfc ||
      "SIN RAZÓN SOCIAL"
    );
  };

  const sortCustomersByStatusAndName = (customersList = []) => {
    return [...customersList].sort((a, b) => {
      const statusA = a.status === false ? 1 : 0;
      const statusB = b.status === false ? 1 : 0;

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      return getCustomerSortName(a).localeCompare(getCustomerSortName(b), "es", {
        sensitivity: "base",
        numeric: true,
      });
    });
  };

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

      showAppAlert({
        type: "danger",
        title: "No se pudieron cargar catálogos",
        message:
          "No se pudieron cargar los catálogos fiscales de régimen fiscal y uso CFDI.",
        confirmText: "Entendido",
      });
    }
  };

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);

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
          is_points_customer,
          created_at,
          updated_at
        `)
        .eq("is_billing_customer", true)
        .order("status", { ascending: false, nullsFirst: false })
        .order("razon_social", { ascending: true, nullsFirst: false });

      if (customersError) throw customersError;

      setCustomers(sortCustomersByStatusAndName(data || []));
    } catch (err) {
      console.error("Error cargando clientes fiscales:", err);
      setCustomers([]);

      showAppAlert({
        type: "danger",
        title: "No se pudieron cargar clientes fiscales",
        message: "No se pudieron cargar los clientes fiscales.",
        confirmText: "Entendido",
      });
    } finally {
      setLoadingCustomers(false);
    }
  };

  const searchPointsCustomerByPhone = async (phone) => {
    try {
      setSearchingPointsCustomer(true);
      setPointsCustomerFound(null);

      if (!phone || phone.length !== 10) {
        return;
      }

      const alreadyFiscalCustomer = customers.some(
        (customer) => normalizePhone(customer.phone) === phone
      );

      if (alreadyFiscalCustomer) {
        return;
      }

      const { data, error: pointsError } = await supabase
        .from("customers")
        .select(`
          id,
          name,
          phone,
          email,
          fiscal_email,
          rfc,
          razon_social,
          postal_code,
          tax_regime,
          cfdi_use,
          status,
          is_billing_customer,
          is_points_customer
        `)
        .eq("phone", phone)
        .eq("is_points_customer", true)
        .or("is_billing_customer.is.null,is_billing_customer.eq.false")
        .maybeSingle();

      if (pointsError) throw pointsError;

      setPointsCustomerFound(data || null);
    } catch (err) {
      console.error("Error buscando cliente de puntos por teléfono:", err);
      setPointsCustomerFound(null);

      showAppAlert({
        type: "danger",
        title: "No se pudo buscar coincidencia",
        message:
          "No se pudo buscar si existe un cliente de puntos con ese teléfono.",
        confirmText: "Entendido",
      });
    } finally {
      setSearchingPointsCustomer(false);
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
            oldRow?.is_billing_customer === true ||
            newRow?.is_points_customer === true ||
            oldRow?.is_points_customer === true;

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

  useEffect(() => {
    const phoneSearch = normalizePhone(searchTerm);

    if (phoneSearch.length !== 10) {
      setPointsCustomerFound(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchPointsCustomerByPhone(phoneSearch);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, customers]);

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

    const filtered = customers.filter((customer) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && customer.status !== false) ||
        (statusFilter === "inactive" && customer.status === false);

      if (!matchesStatus) return false;

      if (!search) return true;

      const values = [
        customer.rfc,
        customer.razon_social,
        customer.name,
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

    return sortCustomersByStatusAndName(filtered);
  }, [customers, searchTerm, statusFilter]);

  const handleNewCustomer = () => {
    setEditingCustomer(null);
    setIsFiscalModalOpen(true);
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setIsFiscalModalOpen(true);
  };

  const handleAddPointsCustomerAsFiscalCustomer = () => {
    if (!pointsCustomerFound?.id) return;

    const customerForFiscalModal = {
      ...pointsCustomerFound,
      razon_social: pointsCustomerFound.razon_social || "",
      phone: pointsCustomerFound.phone || "",
      fiscal_email:
        pointsCustomerFound.fiscal_email || pointsCustomerFound.email || "",
      status: pointsCustomerFound.status !== false,
    };

    setEditingCustomer(customerForFiscalModal);
    setIsFiscalModalOpen(true);
  };

  const handleCloseFiscalModal = () => {
    setIsFiscalModalOpen(false);
    setEditingCustomer(null);
  };

  const handleFiscalSaved = async () => {
    await loadCustomers();
    setPointsCustomerFound(null);
    setSearchTerm("");
  };

  const updateCustomerStatus = async (customer, nextStatus) => {
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

      showAppAlert({
        type: "success",
        title: nextStatus
          ? "Cliente fiscal activado"
          : "Cliente fiscal desactivado",
        message: `El cliente fiscal "${getCustomerDisplayName(
          customer
        )}" fue ${nextStatus ? "activado" : "desactivado"} correctamente.`,
        confirmText: "Aceptar",
      });
    } catch (err) {
      console.error("Error actualizando cliente fiscal:", err);

      showAppAlert({
        type: "danger",
        title: "No se pudo actualizar",
        message: "No se pudo actualizar el estado del cliente fiscal.",
        confirmText: "Entendido",
      });
    }
  };

  const confirmCustomerStatusUpdate = (customer, nextStatus) => {
    showAppConfirm({
      type: nextStatus ? "info" : "danger",
      title: nextStatus
        ? "Activar cliente fiscal"
        : "Desactivar cliente fiscal",
      message: `¿Seguro que deseas ${
        nextStatus ? "activar" : "desactivar"
      } al cliente fiscal "${getCustomerDisplayName(customer)}"?`,
      confirmText: nextStatus ? "Sí, activar" : "Sí, desactivar",
      cancelText: "Cancelar",
      onConfirm: () => updateCustomerStatus(customer, nextStatus),
    });
  };

  const handleToggleStatus = async (customer) => {
    const nextStatus = customer.status === false;

    if (nextStatus) {
      confirmCustomerStatusUpdate(customer, true);
      return;
    }

    const isAdmin = await checkUserIsAdmin(user?.id);

    if (isAdmin) {
      confirmCustomerStatusUpdate(customer, false);
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

    confirmCustomerStatusUpdate(customerToDeactivate, false);
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
              onClick={() => {
                setSearchTerm("");
                setPointsCustomerFound(null);
              }}
            >
              ×
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

      {searchingPointsCustomer && (
        <div className={styles.infoMessage}>
          Buscando coincidencias de clientes por teléfono...
        </div>
      )}

      {pointsCustomerFound && (
        <div className={styles.pointsMatchCard}>
          <div className={styles.pointsMatchInfo}>
            <h3>Cliente de puntos encontrado</h3>

            <p>
              Este teléfono ya existe en el módulo de clientes. Puedes agregarle
              datos fiscales sin duplicarlo.
            </p>

            <div className={styles.pointsDataGrid}>
              <div>
                <span>Nombre</span>
                <strong>{pointsCustomerFound.name || "SIN NOMBRE"}</strong>
              </div>

              <div>
                <span>Teléfono</span>
                <strong>{pointsCustomerFound.phone || "SIN TELÉFONO"}</strong>
              </div>

              <div>
                <span>Correo</span>
                <strong>{pointsCustomerFound.email || "SIN CORREO"}</strong>
              </div>

              <div>
                <span>Estado</span>
                <strong>
                  {pointsCustomerFound.status === false ? "INACTIVO" : "ACTIVO"}
                </strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.linkPointsButton}
            onClick={handleAddPointsCustomerAsFiscalCustomer}
          >
            Agregar datos fiscales
          </button>
        </div>
      )}

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
        onSaved={handleFiscalSaved}
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
            ? `Para desactivar al cliente fiscal "${getCustomerDisplayName(
                pendingDeactivateCustomer
              )}", se requiere autorización de un administrador.`
            : "Para desactivar este cliente fiscal, se requiere autorización de un administrador."
        }
        targetId={pendingDeactivateCustomer?.id || null}
        branchId={branch?.id || null}
      />

      <AppModal
        isOpen={appModal.isOpen}
        type={appModal.type}
        title={appModal.title}
        message={appModal.message}
        confirmText={appModal.confirmText}
        cancelText={appModal.cancelText}
        showCancel={appModal.showCancel}
        loading={appModal.loading}
        onConfirm={appModal.onConfirm || closeAppModal}
        onCancel={appModal.onCancel || closeAppModal}
        onClose={closeAppModal}
      />
    </div>
  );
};

export default InvoiceCustomers;