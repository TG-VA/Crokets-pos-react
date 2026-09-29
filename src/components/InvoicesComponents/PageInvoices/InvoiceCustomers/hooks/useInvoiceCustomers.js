import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../../../contexts/AuthContext";
import { useBranch } from "../../../../../contexts/BranchContext";
import { checkUserIsAdmin } from "../../../../../lib/permissionsService";
import { useAppModal } from "../../../../../hooks/useAppModal";
import { subscribeToTableChanges } from "../../../services/invoicesRealtimeService";
import { normalizePhoneDigits } from "../../../utils/invoiceFormatters";
import {
  fetchCfdiUses,
  fetchTaxRegimes,
} from "../../../services/invoicesCatalogService";
import {
  fetchInvoiceCustomers,
  searchPointsCustomerByPhone as searchPointsCustomerByPhoneQuery,
  shouldRefreshOnCustomerChange,
  updateInvoiceCustomerStatus,
} from "../services/invoiceCustomersService";
import {
  buildAdminAuthMessage,
  buildCatalogMap,
  buildPointsCustomerForFiscalModal,
  buildStatusConfirmMessage,
  buildStatusSuccessMessage,
  filterInvoiceCustomers,
  isPhoneAlreadyFiscalCustomer,
} from "../services/invoiceCustomersCalculationService";

const PHONE_SEARCH_DEBOUNCE_MS = 300;
const FISCAL_MATCH_TITLE = "Cliente de puntos encontrado";

export const useInvoiceCustomers = () => {
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

  const { appModal, closeAppModal, showAppAlert, showAppConfirm } =
    useAppModal();

  const loadCatalogs = useCallback(async () => {
    try {
      const [uses, regimes] = await Promise.all([
        fetchCfdiUses(),
        fetchTaxRegimes(),
      ]);

      setCfdiUses(uses);
      setTaxRegimes(regimes);
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
    // `showAppAlert` cambia de identidad en cada render; depender de ella
    // re-dispararia la carga inicial en un bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      setLoadingCustomers(true);

      setCustomers(await fetchInvoiceCustomers());
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchPointsCustomer = useCallback(
    async (phone) => {
      try {
        setSearchingPointsCustomer(true);
        setPointsCustomerFound(null);

        if (!phone || phone.length !== 10) {
          return;
        }

        if (isPhoneAlreadyFiscalCustomer(customers, phone)) {
          return;
        }

        setPointsCustomerFound(await searchPointsCustomerByPhoneQuery(phone));
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
    },
    // `showAppAlert` cambia de identidad en cada render; depender de ella
    // re-dispararia la busqueda del telefono en un bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customers]
  );

  useEffect(() => {
    // Carga inicial de la pantalla; deuda heredada de `set-state-in-effect`
    // registrada en `KNOWN_ISSUES.md` #56.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCatalogs();
    loadCustomers();
  }, [loadCatalogs, loadCustomers]);

  useEffect(() => {
    return subscribeToTableChanges({
      channelName: "invoice-customers-realtime",
      tables: ["customers"],
      // La tabla `customers` tambien recibe altas de ventas y de puntos que no
      // aparecen en esta pantalla: filtrar aqui evita recargar en cada venta.
      onChange: (payload) => {
        if (shouldRefreshOnCustomerChange(payload)) {
          loadCustomers();
        }
      },
    });
  }, [loadCustomers]);

  useEffect(() => {
    const phoneSearch = normalizePhoneDigits(searchTerm);

    if (phoneSearch.length !== 10) {
      // Deuda heredada de `set-state-in-effect` (`KNOWN_ISSUES.md` #56).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPointsCustomerFound(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchPointsCustomer(phoneSearch);
    }, PHONE_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, customers, searchPointsCustomer]);

  const cfdiUseMap = useMemo(() => buildCatalogMap(cfdiUses), [cfdiUses]);
  const taxRegimeMap = useMemo(() => buildCatalogMap(taxRegimes), [taxRegimes]);

  const filteredCustomers = useMemo(
    () => filterInvoiceCustomers(customers, searchTerm, statusFilter),
    [customers, searchTerm, statusFilter]
  );

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

    setEditingCustomer(buildPointsCustomerForFiscalModal(pointsCustomerFound));
    setIsFiscalModalOpen(true);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setPointsCustomerFound(null);
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

  const executeCustomerStatusUpdate = async (customer, nextStatus) => {
    try {
      await updateInvoiceCustomerStatus({
        customerId: customer.id,
        nextStatus,
      });

      await loadCustomers();

      showAppAlert({
        type: "success",
        title: nextStatus
          ? "Cliente fiscal activado"
          : "Cliente fiscal desactivado",
        message: buildStatusSuccessMessage(customer, nextStatus),
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
      message: buildStatusConfirmMessage(customer, nextStatus),
      confirmText: nextStatus ? "Sí, activar" : "Sí, desactivar",
      cancelText: "Cancelar",
      onConfirm: () => executeCustomerStatusUpdate(customer, nextStatus),
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

  return {
    adminAuthMessage: buildAdminAuthMessage(pendingDeactivateCustomer),
    adminAuthOpen,
    appModal,
    branchId: branch?.id || null,
    cfdiUseMap,
    clearSearch: handleClearSearch,
    closeAppModal,
    editingCustomer,
    filteredCustomers,
    handleAddPointsCustomerAsFiscalCustomer,
    handleAdminAuthorizedDeactivate,
    handleCloseAdminAuth,
    handleCloseFiscalModal,
    handleEditCustomer,
    handleFiscalSaved,
    handleNewCustomer,
    handleToggleStatus,
    isFiscalModalOpen,
    loadCustomers,
    loadingCustomers,
    pendingDeactivateCustomer,
    pointsMatchTitle: FISCAL_MATCH_TITLE,
    pointsCustomerFound,
    searchingPointsCustomer,
    searchTerm,
    setSearchTerm,
    setStatusFilter,
    statusFilter,
    taxRegimeMap,
  };
};
