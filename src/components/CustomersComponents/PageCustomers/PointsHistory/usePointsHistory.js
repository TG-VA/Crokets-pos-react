import { useEffect, useMemo, useState } from "react";

import { useBranch } from "../../../../contexts/BranchContext";
import { useAppModal } from "../../../../hooks/useAppModal";
import { subscribeToTableChanges } from "../services/customersRealtimeService";
import {
  fetchBranches,
  fetchPointsMovements,
} from "./services/pointsHistoryService";
import {
  calculateMovementsSummary,
  filterMovements,
  filterMovementsByCustomerSearch,
  resolveCustomerSearchLabel,
} from "./services/pointsHistoryCalculationService";

export const usePointsHistory = () => {
  const { branch } = useBranch();

  const [movements, setMovements] = useState([]);
  const [branches, setBranches] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [movementFilter, setMovementFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const [loadingMovements, setLoadingMovements] = useState(false);

  const { appModal, closeAppModal, showAppAlert } = useAppModal();

  const loadBranches = async () => {
    try {
      setBranches(await fetchBranches());
    } catch (err) {
      console.error("Error cargando sucursales:", err);
      setBranches([]);

      showAppAlert({
        type: "danger",
        title: "No se pudieron cargar sucursales",
        message:
          "No se pudieron cargar las sucursales para el filtro del historial.",
        confirmText: "Entendido",
      });
    }
  };

  const loadMovements = async () => {
    try {
      setLoadingMovements(true);

      setMovements(await fetchPointsMovements());
    } catch (err) {
      console.error("Error cargando historial de puntos:", err);
      setMovements([]);

      showAppAlert({
        type: "danger",
        title: "No se pudo cargar",
        message: "No se pudo cargar el historial de puntos.",
        confirmText: "Entendido",
      });
    } finally {
      setLoadingMovements(false);
    }
  };

  const refreshAll = () => {
    loadBranches();
    loadMovements();
  };

  useEffect(() => {
    loadBranches();
    loadMovements();
    // La carga inicial corre una sola vez; los cambios posteriores llegan por las
    // suscripciones en vivo de movimientos y sucursales.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!branch?.id) return;

    setBranchFilter((currentFilter) => {
      if (!currentFilter || currentFilter === "all") {
        return branch.id;
      }

      return currentFilter;
    });
  }, [branch?.id]);

  useEffect(() => {
    const unsubscribePoints = subscribeToTableChanges({
      channelName: "points-history-customer-points-realtime",
      tables: ["customer_points"],
      onChange: loadMovements,
    });

    const unsubscribeBranches = subscribeToTableChanges({
      channelName: "points-history-branches-realtime",
      tables: ["branches"],
      onChange: loadBranches,
    });

    return () => {
      unsubscribePoints();
      unsubscribeBranches();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseMovementsForSummary = useMemo(() => {
    return filterMovementsByCustomerSearch({ movements, searchTerm });
  }, [movements, searchTerm]);

  const filteredMovements = useMemo(() => {
    return filterMovements({
      movements,
      searchTerm,
      movementFilter,
      branchFilter,
    });
  }, [movements, searchTerm, movementFilter, branchFilter]);

  const summary = useMemo(() => {
    return calculateMovementsSummary(baseMovementsForSummary);
  }, [baseMovementsForSummary]);

  const customerSearchLabel = useMemo(() => {
    return resolveCustomerSearchLabel({ movements, searchTerm });
  }, [movements, searchTerm]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setMovementFilter("all");
    setBranchFilter(branch?.id || "all");
  };

  const hasActiveFilters =
    searchTerm.trim() ||
    movementFilter !== "all" ||
    branchFilter !== (branch?.id || "all");

  return {
    appModal,
    branchFilter,
    branches,
    closeAppModal,
    customerSearchLabel,
    filteredMovements,
    handleClearFilters,
    hasActiveFilters,
    loadingMovements,
    movementFilter,
    refreshAll,
    searchTerm,
    setBranchFilter,
    setMovementFilter,
    setSearchTerm,
    summary,
  };
};
