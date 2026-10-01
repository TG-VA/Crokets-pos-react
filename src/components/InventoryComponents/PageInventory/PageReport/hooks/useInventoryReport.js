import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "../../../../../lib/supabaseClient";
import { useBranch } from "../../../../../contexts/BranchContext";

import {
  fetchBranchOptions,
  fetchInventoryReportRows,
  getBranchOptionsFallback,
} from "../services/inventoryReportService";
import { useRequestStatus } from "../../../../../hooks/useRequestStatus";

const REALTIME_REFRESH_DELAY_MS = 250;

const useInventoryReport = () => {
  const { branch } = useBranch();

  const [branchOptions, setBranchOptions] = useState([]);
  const [branchOverride, setBranchOverride] = useState("");

  // La sucursal efectiva se deriva: la seleccion explicita del usuario manda y,
  // mientras no exista, se usa la sucursal del contexto. Antes esto se resolvia
  // con un efecto que hacia setSelectedBranchId(branch.id) y provocaba un
  // re-render en cascada; ahora no hay estado que sincronizar.
  const selectedBranchId = branchOverride || branch?.id || "";

  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  // La carga se deriva de la sucursal pedida en lugar de marcarse con un
  // setLoading(true) sincrono, que provocaba un re-render en cascada. Sin
  // sucursal la clave es null, que es justamente la clave inicial de las
  // peticiones resueltas, asi que no hay nada pendiente que mostrar.
  const requestKey = selectedBranchId || null;
  const { isLoading, isStale, markSettled } = useRequestStatus(requestKey);

  // El error de una peticion anterior no debe mostrarse mientras corre la nueva.
  const visibleError = isStale ? "" : error;

  // Sin sucursal no hay reporte que mostrar; antes esto se resolvia limpiando
  // filas y error desde dentro de la carga, con lo que ademas habia que esperar
  // un turno de render para que la tabla quedara vacia.
  const visibleRows = selectedBranchId ? rows : [];

  const isMountedRef = useRef(true);
  const inventoryRequestIdRef = useRef(0);
  const inventoryRefreshTimeoutRef = useRef(null);
  const branchesRefreshTimeoutRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadBranches = useCallback(async () => {
    try {
      const options = await fetchBranchOptions(branch);

      if (!isMountedRef.current) {
        return;
      }

      setBranchOptions(options);
    } catch (loadError) {
      console.error("Error cargando sucursales:", loadError);

      if (!isMountedRef.current) {
        return;
      }

      setBranchOptions(getBranchOptionsFallback(branch));
    }
  }, [branch]);

  // El efecto llama directo a la funcion de datos importada y aplica el estado
  // en la continuacion asincrona; `loadBranches` queda para el refresco en
  // tiempo real disparado por la suscripcion.
  useEffect(() => {
    let cancelled = false;

    fetchBranchOptions(branch)
      .then((options) => {
        if (cancelled) return;
        setBranchOptions(options);
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.error("Error cargando sucursales:", loadError);
        setBranchOptions(getBranchOptionsFallback(branch));
      });

    return () => {
      cancelled = true;
    };
  }, [branch]);

  useEffect(() => {
    const scheduleBranchesRefresh = () => {
      if (branchesRefreshTimeoutRef.current) {
        window.clearTimeout(branchesRefreshTimeoutRef.current);
      }

      branchesRefreshTimeoutRef.current = window.setTimeout(() => {
        loadBranches();
      }, REALTIME_REFRESH_DELAY_MS);
    };

    const channel = supabase
      .channel("inventory-report-branches")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "branches",
        },
        scheduleBranchesRefresh
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(
            "No se pudo conectar Realtime para sucursales:",
            status
          );
        }
      });

    return () => {
      if (branchesRefreshTimeoutRef.current) {
        window.clearTimeout(branchesRefreshTimeoutRef.current);

        branchesRefreshTimeoutRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [loadBranches]);

  const loadInventoryByBranch = useCallback(async () => {
    if (!selectedBranchId) {
      return;
    }

    const requestId = inventoryRequestIdRef.current + 1;

    inventoryRequestIdRef.current = requestId;

    if (isMountedRef.current) {
      setError("");
    }

    try {
      const inventoryRows = await fetchInventoryReportRows(selectedBranchId);

      const isLatestRequest = inventoryRequestIdRef.current === requestId;

      if (isMountedRef.current && isLatestRequest) {
        setRows(inventoryRows);
      }
    } catch (loadError) {
      console.error("Error cargando reporte de inventario:", loadError);

      const isLatestRequest = inventoryRequestIdRef.current === requestId;

      if (isMountedRef.current && isLatestRequest) {
        setRows([]);
        setError("No se pudo cargar el reporte de inventario.");
      }
    } finally {
      const isLatestRequest = inventoryRequestIdRef.current === requestId;

      if (isMountedRef.current && isLatestRequest) {
        markSettled();
      }
    }
  }, [selectedBranchId, markSettled]);

  useEffect(() => {
    if (!selectedBranchId) {
      return undefined;
    }

    let cancelled = false;
    const requestId = inventoryRequestIdRef.current + 1;
    inventoryRequestIdRef.current = requestId;

    fetchInventoryReportRows(selectedBranchId)
      .then((inventoryRows) => {
        if (cancelled) return;
        setRows(inventoryRows);
        setError("");
        markSettled();
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.error("Error cargando reporte de inventario:", loadError);
        setRows([]);
        setError("No se pudo cargar el reporte de inventario.");
        markSettled();
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBranchId, markSettled]);

  useEffect(() => {
    if (!selectedBranchId) {
      return undefined;
    }

    const scheduleInventoryRefresh = () => {
      if (inventoryRefreshTimeoutRef.current) {
        window.clearTimeout(inventoryRefreshTimeoutRef.current);
      }

      inventoryRefreshTimeoutRef.current = window.setTimeout(() => {
        loadInventoryByBranch();
      }, REALTIME_REFRESH_DELAY_MS);
    };

    const channel = supabase
      .channel(`inventory-report-realtime-${selectedBranchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "branch_inventory",
          filter: `branch_id=eq.${selectedBranchId}`,
        },
        scheduleInventoryRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        scheduleInventoryRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "departments",
        },
        scheduleInventoryRefresh
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("No se pudo conectar Realtime al reporte:", status);
        }
      });

    return () => {
      if (inventoryRefreshTimeoutRef.current) {
        window.clearTimeout(inventoryRefreshTimeoutRef.current);

        inventoryRefreshTimeoutRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [selectedBranchId, loadInventoryByBranch]);

  const handleBranchChange = (branchId) => {
    setBranchOverride(branchId);
  };

  return {
    branchOptions,
    selectedBranchId,
    rows: visibleRows,
    loading: isLoading,
    error: visibleError,
    handleBranchChange,
  };
};

export default useInventoryReport;
