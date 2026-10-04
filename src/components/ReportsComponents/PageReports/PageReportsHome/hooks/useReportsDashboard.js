import { useCallback, useEffect, useRef, useState } from "react";

import {
  getBranchesCatalog,
  getEmptyReportsDashboard,
  getReportsDashboard,
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

  const [dashboard, setDashboard] = useState(() => getEmptyReportsDashboard());

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
        console.error("Error al cargar catálogo de sucursales:", catalogError);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // `loading` se deriva de la sucursal pedida: cambiar de sucursal marca la
  // carga como pendiente en la misma pasada de render, sin un setState sincrono
  // que provocara un re-render en cascada. Las recargas silenciosas no cambian
  // la clave, asi que no encienden el spinner principal y usan solo `refreshing`.
  const {
    isLoading,
    isStale: isBranchStale,
    markSettled,
  } = useRequestStatus(selectedBranchId);

  const errorVisible = isBranchStale ? "" : error;

  // Una peticion sigue vigente si el componente sigue montado y ninguna
  // peticion posterior tomo su lugar. Solo lee refs, asi que puede declararse
  // sin dependencias y la regla de set-state-in-effect no lo marca.
  const isRequestCurrent = useCallback(
    (requestId) => mountedRef.current && requestId === requestIdRef.current,
    []
  );

  // El panel se vacia al cambiar de sucursal durante el render, no desde un
  // efecto, para no mostrar datos de la sucursal anterior bajo el spinner.
  useDidChange(selectedBranchId, () => {
    setDashboard(getEmptyReportsDashboard());
  });

  // El refresco silencioso (auto-refresh y recarga manual) no cambia la clave de
  // peticion, asi que no enciende el spinner principal: solo marca `refreshing`.
  const loadDashboard = useCallback(
    ({ silent = false } = {}) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (silent) {
        setRefreshing(true);
      }

      setError("");
      lastFetchTimeRef.current = Date.now();

      return getReportsDashboard(selectedBranchId)
        .then((result) => {
          if (!isRequestCurrent(requestId)) return;
          setDashboard(result);
        })
        .catch((loadError) => {
          if (!isRequestCurrent(requestId)) return;
          console.error("Error cargando el dashboard de reportes:", loadError);
          setError(
            loadError?.message || "No se pudo cargar el resumen de reportes."
          );
        })
        .finally(() => {
          if (!isRequestCurrent(requestId)) return;
          setRefreshing(false);
        });
    },
    [selectedBranchId, isRequestCurrent]
  );

  const reloadDashboard = useCallback(async () => {
    const now = Date.now();
    if (isLoading || refreshing || now - lastFetchTimeRef.current < 4000) {
      return;
    }

    await loadDashboard({
      silent: dashboard.meta.generatedAt !== null,
    });
  }, [dashboard.meta.generatedAt, loadDashboard, isLoading, refreshing]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  // La carga por cambio de sucursal llama directamente a la funcion de datos
  // importada: el efecto escribe estado solo en la continuacion asincrona, nunca
  // de forma sincrona, y por eso no encadena un re-render.
  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    lastFetchTimeRef.current = Date.now();

    getReportsDashboard(selectedBranchId)
      .then((result) => {
        if (!isRequestCurrent(requestId)) return;
        setDashboard(result);
        // El error anterior se limpia al llegar datos; mientras la carga esta
        // pendiente ya queda oculto por `errorVisible`, asi que no hace falta
        // un setState sincrono al inicio del efecto.
        setError("");
        markSettled();
      })
      .catch((loadError) => {
        if (!isRequestCurrent(requestId)) return;
        console.error("Error cargando el dashboard de reportes:", loadError);
        setError(
          loadError?.message || "No se pudo cargar el resumen de reportes."
        );
        markSettled();
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
    loading: isLoading,
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
