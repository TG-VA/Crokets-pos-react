import { useCallback, useEffect, useRef, useState } from "react";

import {
  getBranchesCatalog,
  getEmptyReportsDashboard,
  getReportsDashboard,
} from "../services/reportsDashboardService";

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

  const [loading, setLoading] = useState(false);
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

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      const currentRequestId = requestIdRef.current + 1;
      requestIdRef.current = currentRequestId;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      lastFetchTimeRef.current = Date.now();

      try {
        const result = await getReportsDashboard(selectedBranchId);

        const isCurrentRequest =
          currentRequestId === requestIdRef.current;

        if (!mountedRef.current || !isCurrentRequest) {
          return;
        }

        setDashboard(result);
      } catch (loadError) {
        const isCurrentRequest =
          currentRequestId === requestIdRef.current;

        if (!mountedRef.current || !isCurrentRequest) {
          return;
        }

        console.error(
          "Error cargando el dashboard de reportes:",
          loadError
        );

        setError(
          loadError?.message ||
            "No se pudo cargar el resumen de reportes."
        );
      } finally {
        const isCurrentRequest =
          currentRequestId === requestIdRef.current;

        if (!mountedRef.current || !isCurrentRequest) {
          return;
        }

        setLoading(false);
        setRefreshing(false);
      }
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
    setDashboard(getEmptyReportsDashboard());

    loadDashboard();
  }, [selectedBranchId, loadDashboard]);

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
    error,
    branches,
    selectedBranchId,
    setSelectedBranchId,
    selectedBranch,
    reloadDashboard,
  };
};

export default useReportsDashboard;

