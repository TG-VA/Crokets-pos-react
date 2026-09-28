import { useEffect, useMemo, useState } from "react";

import { useAppModal } from "../../../../../hooks/useAppModal";
import { subscribeToTableChanges } from "../../services/customersRealtimeService";
import { sortCustomersByName } from "../../utils/customerFormatters";
import { calculatePointsBalance } from "../../services/customerPointsCalculationService";
import {
  fetchActiveRewards,
  fetchCustomerPointsMovements,
  searchActivePointsCustomers,
} from "../services/rewardsAvailabilityService";
import {
  calculateRewardsStats,
  isSearchableCustomerTerm,
} from "../services/rewardsAvailabilityCalculationService";

export const useRewardsAvailability = () => {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [rewards, setRewards] = useState([]);
  const [customerPoints, setCustomerPoints] = useState(0);

  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [loadingPoints, setLoadingPoints] = useState(false);

  const { appModal, closeAppModal, showAppAlert } = useAppModal();

  const hasSelectedCustomer = !!selectedCustomer?.id;

  const rewardsStats = useMemo(() => {
    return calculateRewardsStats({
      rewards,
      customerPoints,
      hasSelectedCustomer,
    });
  }, [hasSelectedCustomer, rewards, customerPoints]);

  const loadRewards = async () => {
    try {
      setLoadingRewards(true);

      setRewards(await fetchActiveRewards());
    } catch (err) {
      console.error("Error cargando recompensas:", err);
      setRewards([]);

      showAppAlert({
        type: "danger",
        title: "No se pudieron cargar recompensas",
        message: "No se pudieron cargar las recompensas activas.",
        confirmText: "Entendido",
      });
    } finally {
      setLoadingRewards(false);
    }
  };

  const loadCustomerPoints = async (customerId) => {
    if (!customerId) {
      setCustomerPoints(0);
      return;
    }

    try {
      setLoadingPoints(true);

      const movements = await fetchCustomerPointsMovements(customerId);

      setCustomerPoints(calculatePointsBalance(movements));
    } catch (err) {
      console.error("Error cargando puntos del cliente:", err);
      setCustomerPoints(0);

      showAppAlert({
        type: "danger",
        title: "No se pudieron cargar puntos",
        message: "No se pudieron cargar los puntos del cliente.",
        confirmText: "Entendido",
      });
    } finally {
      setLoadingPoints(false);
    }
  };

  const searchCustomers = async (searchValue = customerSearch) => {
    if (!isSearchableCustomerTerm(searchValue)) {
      setCustomerResults([]);
      return;
    }

    try {
      setLoadingCustomers(true);

      const customersData = await searchActivePointsCustomers(searchValue);

      setCustomerResults(sortCustomersByName(customersData));
    } catch (err) {
      console.error("Error buscando clientes:", err);
      setCustomerResults([]);

      showAppAlert({
        type: "danger",
        title: "No se pudieron buscar clientes",
        message: "Ocurrió un error al buscar clientes.",
        confirmText: "Entendido",
      });
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleSelectCustomer = async (customer) => {
    if (customer.status === false) {
      showAppAlert({
        type: "warning",
        title: "Cliente inactivo",
        message:
          "No se pueden consultar recompensas para clientes inactivos. Activa el cliente antes de continuar.",
        confirmText: "Entendido",
      });
      return;
    }

    if (customer.is_points_customer !== true) {
      showAppAlert({
        type: "warning",
        title: "Cliente no válido",
        message:
          "Este cliente no está registrado como cliente de puntos. Activa el programa de puntos antes de consultar recompensas.",
        confirmText: "Entendido",
      });
      return;
    }

    setSelectedCustomer(customer);
    setCustomerSearch("");
    setCustomerResults([]);

    await loadCustomerPoints(customer.id);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerPoints(0);
    setCustomerResults([]);
    setCustomerSearch("");
  };

  const handleSearchChange = (value) => {
    setCustomerSearch(value);
    setSelectedCustomer(null);
    setCustomerPoints(0);
  };

  const handleManualSearch = () => {
    if (!customerSearch.trim()) {
      showAppAlert({
        type: "warning",
        title: "Búsqueda requerida",
        message: "Ingresa nombre, teléfono o correo para buscar cliente.",
        confirmText: "Entendido",
      });
      return;
    }

    if (customerSearch.trim().length < 2) {
      showAppAlert({
        type: "warning",
        title: "Búsqueda muy corta",
        message: "Ingresa al menos 2 caracteres para buscar cliente.",
        confirmText: "Entendido",
      });
      return;
    }

    searchCustomers(customerSearch);
  };

  useEffect(() => {
    loadRewards();
    // La carga inicial corre una sola vez: las reactivaciones en vivo llegan
    // por la suscripcion de la tabla de recompensas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const searchValue = customerSearch.trim();

    if (!searchValue || searchValue.length < 2) {
      setCustomerResults([]);
      setLoadingCustomers(false);
      return;
    }

    const searchTimeout = setTimeout(() => {
      setSelectedCustomer(null);
      setCustomerPoints(0);
      searchCustomers(searchValue);
    }, 350);

    return () => clearTimeout(searchTimeout);
    // `searchCustomers` se recrea en cada render, por lo que la busqueda
    // automatica se dispara por cambios del termino, no por su identidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerSearch]);

  useEffect(() => {
    return subscribeToTableChanges({
      channelName: "rewards-query-rewards-realtime",
      tables: ["rewards"],
      onChange: loadRewards,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCustomer?.id) return;

    return subscribeToTableChanges({
      channelName: `customer-points-query-${selectedCustomer.id}`,
      tables: ["customer_points"],
      rowFilter: `customer_id=eq.${selectedCustomer.id}`,
      onChange: () => loadCustomerPoints(selectedCustomer.id),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?.id]);

  return {
    appModal,
    closeAppModal,
    customerPoints,
    customerResults,
    customerSearch,
    hasSelectedCustomer,
    handleClearCustomer,
    handleManualSearch,
    handleSearchChange,
    handleSelectCustomer,
    loadRewards,
    loadingCustomers,
    loadingPoints,
    loadingRewards,
    rewards,
    rewardsStats,
    selectedCustomer,
  };
};
