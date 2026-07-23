import { useCallback, useEffect, useRef, useState } from "react";

import { useBranch } from "../../../../../contexts/BranchContext";

import {
  getEmptyReportsDashboard,
  getReportsDashboard,
} from "../services/reportsDashboardService";

const AUTO_REFRESH_INTERVAL = 60_000;

const useReportsDashboard = () => {
  const { branch } = useBranch();

  const branchId = branch?.id ?? null;

  const [dashboard, setDashboard] = useState(() =>
    getEmptyReportsDashboard()
  );

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      const currentRequestId = requestIdRef.current + 1;
      requestIdRef.current = currentRequestId;

      if (!branchId) {
        setDashboard(getEmptyReportsDashboard());
        setLoading(false);
        setRefreshing(false);
        setError("");
        return;
      }

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const result = await getReportsDashboard(branchId);

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
    [branchId]
  );

  const reloadDashboard = useCallback(async () => {
    await loadDashboard({
      silent: dashboard.meta.generatedAt !== null,
    });
  }, [dashboard.meta.generatedAt, loadDashboard]);

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
  }, [branchId, loadDashboard]);

  useEffect(() => {
    if (!branchId) return undefined;

    const intervalId = window.setInterval(() => {
      loadDashboard({
        silent: true,
      });
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [branchId, loadDashboard]);

  useEffect(() => {
    if (!branchId) return undefined;

    const handleWindowFocus = () => {
      loadDashboard({
        silent: true,
      });
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [branchId, loadDashboard]);

  return {
    dashboard,
    loading,
    refreshing,
    error,
    branch,
    branchId,
    reloadDashboard,
  };
};

export default useReportsDashboard;