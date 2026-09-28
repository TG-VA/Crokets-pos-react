import React, { useEffect, useMemo, useState } from "react";
import styles from "./CustomersList.module.css";
import CustomerModal from "../../Modals/CustomerModal/CustomerModal";

import { useAuth } from "../../../../contexts/AuthContext";
import { useBranch } from "../../../../contexts/BranchContext";
import { checkUserIsAdmin } from "../../../../lib/permissionsService";
import { useAppModal } from "../../../../hooks/useAppModal";
import AdminAuthorizationModal from "../../../AdminAuthorizationModal/AdminAuthorizationModal";
import AppModal from "../../../AppModal/AppModal";
import { subscribeToTableChanges } from "../services/customersRealtimeService";
import { normalizePhoneDigits } from "../utils/customerFormatters";
import {
  fetchPointsCustomers,
  fetchPointsMovements,
  searchFiscalCustomerByPhone,
  updateCustomerStatus,
} from "./services/customersListService";
import {
  buildPointsCustomerFromFiscal,
  calculatePointsBalanceByCustomer,
  filterAndSortCustomers,
  formatCustomerStatus,
  isCompletePhone,
  isPhoneAvailableInPoints,
} from "./services/customersListCalculationService";

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

  const { appModal, closeAppModal, showAppAlert, showAppConfirm } =
    useAppModal();

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);

      const customersData = await fetchPointsCustomers();
      setCustomers(customersData);

      if (customersData.length === 0) {
        setPointsByCustomer({});
        return;
      }

      const pointsRows = await fetchPointsMovements(
        customersData.map((customer) => customer.id)
      );

      setPointsByCustomer(calculatePointsBalanceByCustomer(pointsRows));
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

  const handleSearchFiscalCustomer = async (phone) => {
    try {
      setSearchingFiscalCustomer(true);
      setFiscalCustomerFound(null);

      if (!phone || phone.length !== 10) {
        return;
      }

      if (!isPhoneAvailableInPoints({ customers, phone })) {
        return;
      }

      const fiscalCustomer = await searchFiscalCustomerByPhone(phone);

      setFiscalCustomerFound(fiscalCustomer);
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
    return subscribeToTableChanges({
      channelName: "customers-list-realtime",
      tables: ["customers", "customer_points"],
      onChange: loadCustomers,
    });
  }, []);

  useEffect(() => {
    const phoneSearch = normalizePhoneDigits(searchTerm);

    if (!isCompletePhone(phoneSearch)) {
      setFiscalCustomerFound(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      handleSearchFiscalCustomer(phoneSearch);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, customers]);

  const filteredCustomers = useMemo(() => {
    return filterAndSortCustomers({ customers, searchTerm, statusFilter });
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

    setEditingCustomer(buildPointsCustomerFromFiscal(fiscalCustomerFound));
    setIsCustomerModalOpen(true);
  };

  const handleCloseCustomerModal = () => {
    setIsCustomerModalOpen(false);
    setEditingCustomer(null);
  };

  const executeCustomerStatusUpdate = async (customer, nextStatus) => {
    try {
      await updateCustomerStatus({
        customerId: customer.id,
        nextStatus,
      });

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

  const confirmCustomerStatusChange = async (customer, nextStatus) => {
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
      await confirmCustomerStatusChange(customer, true);
      return;
    }

    const isAdmin = await checkUserIsAdmin(user?.id);

    if (isAdmin) {
      await confirmCustomerStatusChange(customer, false);
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

    await confirmCustomerStatusChange(customer, false);
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
                      {formatCustomerStatus(customer.status)}
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
