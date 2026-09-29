import { useCallback, useEffect, useRef, useState } from "react";

import {
  getBranchesCatalog,
  getEmptyReportsDashboard,
  loadReportsDashboard,
} from "../services/reportsDashboardService";
import { useDidChange } from "../../../../../hooks/useDidChange";
import { useRequestStatus } from "../../../../../hooks/useRequestStatus";

const AUTO_REFRESH_INTERVAL = 300_000; // 5 minutos

const ALL_BRANCHES_OPTION = {
  id: "ALL",
  name: "Todas las sucursales (Consolidado)",
};

const useReportsDashboard = () => {
  const [branches, setBranches] = useState([ALL_BRANCHES_OPTION]);
  const [selectedBranchId, setSelectedBranchId] = useState("ALL");

  const [dashboard, setDashboard] = useState(() =>
    getEmptyReportsDashboard()
  );

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const lastFetchTimeRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    getBranchesCatalog()
      .then((items) => {
        if (!isMounted) return;

        setBranches([
          ALL_BRANCHES_OPTION,
          ...(items || []).map((item) => ({
            id: item.id,
            name: item.name,
          })),
        ]);
      })
      .catch((catalogError) => {
        console.error(
          "Error al cargar catálogo de sucursales:",
          catalogError
        );
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // `loading` se deriva de la sucursal pedida: cambiar de sucursal marca la
  // carga como pendiente en la misma pasada de render, sin un setState sincrono
  // que provocara un re-render en cascada. Las recargas silenciosas no cambian
  // la clave, asi que no encienden el spinner principal y usan solo `refreshing`.
  const { loading, isStale: isBranchStale, markSettled } =
    useRequestStatus(selectedBranchId);

  const errorVisible = isBranchStale ? "" : error;

  // El panel se vacia al cambiar de sucursal durante el render, no desde un
  // efecto, para no mostrar datos de la sucursal anterior bajo el spinner.
  useDidChange(selectedBranchId, () => {
    setDashboard(getEmptyReportsDashboard());
  });

  const loadDashboard = useCallback(
    ({ silent = false } = {}) => {
      const currentRequestId = requestIdRef.current + 1;
      requestIdRef.current = currentRequestId;

      if (silent) {
        setRefreshing(true);
      }

      setError("");
      lastFetchTimeRef.current = Date.now();

      const isStale = () =>
        !mountedRef.current || currentRequestId !== requestIdRef.current;

      return loadReportsDashboard(selectedBranchId, {
        isStale,
        onData: setDashboard,
        onError: setError,
        onSettled: () => setRefreshing(false),
      });
    },
    [selectedBranchId]
  );

  const reloadDashboard = useCallback(async () => {
    const now = Date.now();
    if (loading || refreshing || now - lastFetchTimeRef.current < 4000) {
      return;
    }

    await loadDashboard({
      silent: dashboard.meta.generatedAt !== null,
    });
  }, [dashboard.meta.generatedAt, loadDashboard, loading, refreshing]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;

    lastFetchTimeRef.current = Date.now();

    const isStale = () =>
      !mountedRef.current || currentRequestId !== requestIdRef.current;

    loadReportsDashboard(selectedBranchId, {
      isStale,
      // El error anterior se limpia al llegar datos nuevos; mientras la carga
      // esta pendiente ya queda oculto por `errorVisible`, asi que no hace
      // falta un setState sincrono al inicio del efecto.
      onData: (result) => {
        setDashboard(result);
        setError("");
      },
      onError: setError,
      onSettled: markSettled,
    });
  }, [selectedBranchId, markSettled]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }

      loadDashboard({
        silent: true,
      });
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [selectedBranchId, loadDashboard]);

  const selectedBranch =
    branches.find((b) => b.id === selectedBranchId) || ALL_BRANCHES_OPTION;

  return {
    dashboard,
    loading,
    refreshing,
    error: errorVisible,
    branches,
    selectedBranchId,
    setSelectedBranchId,
    selectedBranch,
    reloadDashboard,
  };
};

export default useReportsDashboard;

