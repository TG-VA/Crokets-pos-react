import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../../../contexts/AuthContext";
import { checkUserIsAdmin } from "../../../../../lib/permissionsService";
import { useAppModal } from "../../../../../hooks/useAppModal";
import { subscribeToTableChanges } from "../../services/customersRealtimeService";
import { normalizePhoneDigits } from "../../utils/customerFormatters";
import {
  fetchPointsCustomers,
  fetchPointsMovements,
  searchFiscalCustomerByPhone,
  updateCustomerStatus,
} from "../services/customersListService";
import {
  buildPointsCustomerFromFiscal,
  calculatePointsBalanceByCustomer,
  filterAndSortCustomers,
  isCompletePhone,
  isPhoneAvailableInPoints,
} from "../services/customersListCalculationService";

export const useCustomersList = () => {
  const { user } = useAuth();

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
    // La carga inicial corre una sola vez; las altas y bajas llegan por la
    // suscripcion en vivo de la tabla de clientes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return subscribeToTableChanges({
      channelName: "customers-list-realtime",
      tables: ["customers", "customer_points"],
      onChange: loadCustomers,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // La busqueda fiscal reacciona al termino y al listado de clientes, no a la
    // identidad de los handlers, que cambia en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleCustomerSaved = async () => {
    await loadCustomers();
    setFiscalCustomerFound(null);
    setSearchTerm("");
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setFiscalCustomerFound(null);
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

  const confirmCustomerStatusChange = (customer, nextStatus) => {
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
      confirmCustomerStatusChange(customer, true);
      return;
    }

    const isAdmin = await checkUserIsAdmin(user?.id);

    if (isAdmin) {
      confirmCustomerStatusChange(customer, false);
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

    confirmCustomerStatusChange(customer, false);
  };

  const handleCloseAdminAuth = () => {
    setAdminAuthOpen(false);
    setPendingDeactivateCustomer(null);
  };

  return {
    adminAuthOpen,
    appModal,
    closeAppModal,
    editingCustomer,
    filteredCustomers,
    fiscalCustomerFound,
    handleAddFiscalCustomerAsPointsCustomer,
    handleAdminAuthorized,
    handleClearSearch,
    handleCloseAdminAuth,
    handleCloseCustomerModal,
    handleCustomerSaved,
    handleEditCustomer,
    handleNewCustomer,
    handleToggleStatus,
    isCustomerModalOpen,
    loadCustomers,
    loadingCustomers,
    pendingDeactivateCustomer,
    pointsByCustomer,
    searchTerm,
    searchingFiscalCustomer,
    setSearchTerm,
    setStatusFilter,
    statusFilter,
  };
};
