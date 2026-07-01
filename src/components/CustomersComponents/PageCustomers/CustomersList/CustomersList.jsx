import React, { useEffect, useMemo, useState } from "react";
import styles from "./CustomersList.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import CustomerModal from "../../Modals/CustomerModal/CustomerModal";

import { useAuth } from "../../../../contexts/AuthContext";
import { useBranch } from "../../../../contexts/BranchContext";
import { checkUserIsAdmin } from "../../../../lib/permissionsService";
import AdminAuthorizationModal from "../../../AdminAuthorizationModal/AdminAuthorizationModal";
import AppModal from "../../../AppModal/AppModal";

const CustomersList = () => {
  const { user } = useAuth();
  const { branch } = useBranch();

  const [customers, setCustomers] = useState([]);
  const [pointsByCustomer, setPointsByCustomer] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [searchingFiscalCustomer, setSearchingFiscalCustomer] = useState(false);
  const [fiscalCustomerFound, setFiscalCustomerFound] = useState(null);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
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

  const calculateCustomerPoints = (pointsRows = []) => {
    const pointsMap = {};

    for (const row of pointsRows) {
      const customerId = row.customer_id;
      const movementType = String(row.movement_type || "").toLowerCase();
      const rawPoints = Number(row.points || 0);

      if (!customerId) continue;

      if (!pointsMap[customerId]) {
        pointsMap[customerId] = 0;
      }

      if (
        movementType.includes("canje") ||
        movementType.includes("redeem") ||
        movementType.includes("used") ||
        movementType.includes("uso") ||
        movementType.includes("resta")
      ) {
        pointsMap[customerId] -= Math.abs(rawPoints);
      } else {
        pointsMap[customerId] += rawPoints;
      }
    }

    return pointsMap;
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
          status,
          is_billing_customer,
          is_points_customer,
          created_at,
          updated_at
        `)
        .eq("is_points_customer", true)
        .order("status", { ascending: false, nullsFirst: false })
        .order("name", { ascending: true, nullsFirst: false });

      if (customersError) throw customersError;

      const customersData = data || [];
      setCustomers(customersData);

      const customerIds = customersData.map((customer) => customer.id);

      if (customerIds.length === 0) {
        setPointsByCustomer({});
        return;
      }

      const { data: pointsRows, error: pointsError } = await supabase
        .from("customer_points")
        .select("customer_id, points, movement_type")
        .in("customer_id", customerIds);

      if (pointsError) throw pointsError;

      setPointsByCustomer(calculateCustomerPoints(pointsRows || []));
    } catch (err) {
      console.error("Error cargando clientes:", err);
      setCustomers([]);
      setPointsByCustomer({});

      showAppAlert({
        type: "danger",
        title: "No se pudieron cargar clientes",
        message: "No se pudieron cargar los clientes.",
        confirmText: "Entendido",
      });
    } finally {
      setLoadingCustomers(false);
    }
  };

  const searchFiscalCustomerByPhone = async (phone) => {
    try {
      setSearchingFiscalCustomer(true);
      setFiscalCustomerFound(null);

      if (!phone || phone.length !== 10) {
        return;
      }

      const alreadyPointCustomer = customers.some(
        (customer) => normalizePhone(customer.phone) === phone
      );

      if (alreadyPointCustomer) {
        return;
      }

      const { data, error: fiscalError } = await supabase
        .from("customers")
        .select(`
          id,
          name,
          phone,
          email,
          rfc,
          razon_social,
          fiscal_email,
          status,
          is_billing_customer,
          is_points_customer
        `)
        .eq("phone", phone)
        .eq("is_billing_customer", true)
        .or("is_points_customer.is.null,is_points_customer.eq.false")
        .maybeSingle();

      if (fiscalError) throw fiscalError;

      setFiscalCustomerFound(data || null);
    } catch (err) {
      console.error("Error buscando cliente fiscal por teléfono:", err);
      setFiscalCustomerFound(null);
    } finally {
      setSearchingFiscalCustomer(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const customersChannel = supabase
      .channel("customers-list-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customers",
        },
        () => {
          loadCustomers();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_points",
        },
        () => {
          loadCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(customersChannel);
    };
  }, []);

  useEffect(() => {
    const phoneSearch = normalizePhone(searchTerm);

    if (phoneSearch.length !== 10) {
      setFiscalCustomerFound(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchFiscalCustomerByPhone(phoneSearch);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, customers]);

  const filteredCustomers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return customers
      .filter((customer) => {
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && customer.status !== false) ||
          (statusFilter === "inactive" && customer.status === false);

        if (!matchesStatus) return false;

        if (!search) return true;

        const values = [customer.name, customer.phone, customer.email];

        return values.some((value) =>
          String(value || "").toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        const statusA = a.status === false ? 1 : 0;
        const statusB = b.status === false ? 1 : 0;

        if (statusA !== statusB) {
          return statusA - statusB;
        }

        return String(a.name || "SIN NOMBRE").localeCompare(
          String(b.name || "SIN NOMBRE"),
          "es",
          { sensitivity: "base" }
        );
      });
  }, [customers, searchTerm, statusFilter]);

  const handleNewCustomer = () => {
    setEditingCustomer(null);
    setIsCustomerModalOpen(true);
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setIsCustomerModalOpen(true);
  };

  const handleAddFiscalCustomerAsPointsCustomer = () => {
    if (!fiscalCustomerFound?.id) return;

    const fiscalCustomerForModal = {
      ...fiscalCustomerFound,
      name: fiscalCustomerFound.name || fiscalCustomerFound.razon_social || "",
      email: fiscalCustomerFound.email || "",
      phone: fiscalCustomerFound.phone || "",
      status: fiscalCustomerFound.status !== false,
    };

    setEditingCustomer(fiscalCustomerForModal);
    setIsCustomerModalOpen(true);
  };

  const handleCloseCustomerModal = () => {
    setIsCustomerModalOpen(false);
    setEditingCustomer(null);
  };

  const executeCustomerStatusUpdate = async (customer, nextStatus) => {
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
        title: nextStatus ? "Cliente activado" : "Cliente desactivado",
        message: `El cliente "${
          customer.name || "SIN NOMBRE"
        }" fue ${nextStatus ? "activado" : "desactivado"} correctamente.`,
        confirmText: "Aceptar",
      });
    } catch (err) {
      console.error("Error actualizando cliente:", err);
      showAppAlert({
        type: "danger",
        title: "No se pudo actualizar",
        message: "No se pudo actualizar el estado del cliente.",
        confirmText: "Entendido",
      });
    }
  };

  const updateCustomerStatus = async (customer, nextStatus) => {
    showAppConfirm({
      type: nextStatus ? "info" : "danger",
      title: nextStatus ? "Activar cliente" : "Desactivar cliente",
      message: `¿Seguro que deseas ${
        nextStatus ? "activar" : "desactivar"
      } al cliente "${customer.name || "SIN NOMBRE"}"?`,
      confirmText: nextStatus ? "Sí, activar" : "Sí, desactivar",
      cancelText: "Cancelar",
      onConfirm: () => executeCustomerStatusUpdate(customer, nextStatus),
    });
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

  const handleAdminAuthorized = async () => {
    const customer = pendingDeactivateCustomer;

    setAdminAuthOpen(false);
    setPendingDeactivateCustomer(null);

    if (!customer?.id) return;

    await updateCustomerStatus(customer, false);
  };

  const handleCloseAdminAuth = () => {
    setAdminAuthOpen(false);
    setPendingDeactivateCustomer(null);
  };

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>CLIENTES</h1>
          <p>
            Administra clientes registrados, datos de contacto, estado y puntos
            acumulados.
          </p>
        </div>

        <button
          type="button"
          className={styles.newButton}
          onClick={handleNewCustomer}
        >
          + Nuevo cliente
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por nombre, teléfono o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {searchTerm && (
            <button
              type="button"
              className={styles.clearSearchButton}
              onClick={() => {
                setSearchTerm("");
                setFiscalCustomerFound(null);
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

      {searchingFiscalCustomer && (
        <div className={styles.infoMessage}>
          Buscando coincidencias fiscales por teléfono...
        </div>
      )}

      {fiscalCustomerFound && (
        <div className={styles.fiscalMatchCard}>
          <div className={styles.fiscalMatchInfo}>
            <h3>Cliente fiscal encontrado</h3>

            <p>
              Este teléfono ya existe en clientes fiscales. Puedes agregarlo
              como cliente de puntos sin duplicarlo.
            </p>

            <div className={styles.fiscalDataGrid}>
              <div>
                <span>Razón social</span>
                <strong>
                  {fiscalCustomerFound.razon_social ||
                    fiscalCustomerFound.name ||
                    "SIN RAZÓN SOCIAL"}
                </strong>
              </div>

              <div>
                <span>RFC</span>
                <strong>{fiscalCustomerFound.rfc || "SIN RFC"}</strong>
              </div>

              <div>
                <span>Teléfono</span>
                <strong>{fiscalCustomerFound.phone || "SIN TELÉFONO"}</strong>
              </div>

              <div>
                <span>Correo fiscal</span>
                <strong>
                  {fiscalCustomerFound.fiscal_email ||
                    fiscalCustomerFound.email ||
                    "SIN CORREO"}
                </strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.linkFiscalButton}
            onClick={handleAddFiscalCustomerAsPointsCustomer}
          >
            Agregar a clientes
          </button>
        </div>
      )}

      <div className={styles.resultsInfo}>
        {loadingCustomers
          ? "Cargando clientes..."
          : `Mostrando ${filteredCustomers.length} cliente${
              filteredCustomers.length !== 1 ? "s" : ""
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
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.textCenter}>
                  No hay clientes registrados con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
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

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={handleCloseCustomerModal}
        onSaved={async () => {
          await loadCustomers();
          setFiscalCustomerFound(null);
          setSearchTerm("");
        }}
        customerToEdit={editingCustomer}
      />

      <AdminAuthorizationModal
        isOpen={adminAuthOpen}
        onClose={handleCloseAdminAuth}
        onAuthorized={handleAdminAuthorized}
        action="customers_deactivate"
        title="Acceso restringido"
        message={
          pendingDeactivateCustomer
            ? `Para desactivar al cliente "${pendingDeactivateCustomer.name}", se requiere autorización de un administrador.`
            : "Para desactivar clientes se requiere autorización de un administrador."
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

export default CustomersList;