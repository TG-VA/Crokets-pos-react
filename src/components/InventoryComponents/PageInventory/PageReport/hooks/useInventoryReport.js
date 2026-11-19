import { useEffect, useRef, useState } from "react";

import { useBranch } from "../../../../../contexts/BranchContext";
import { isOperationalBranch } from "../../../../../services/branchScopeCalculationService";

import {
  fetchBranchOptions,
  fetchInventoryReportRows,
  getBranchOptionsFallback,
} from "../services/inventoryReportService";
import {
  subscribeToBranchListChanges,
  subscribeToInventoryReportChanges,
} from "../services/inventoryReportRealtimeService";
import {
  isRelevantDepartmentChange,
  isRelevantProductChange,
} from "../utils/inventoryReportRealtimeFilters";
import { useRequestStatus } from "../../../../../hooks/useRequestStatus";

const REALTIME_REFRESH_DELAY_MS = 250;
const EMPTY_ROWS = [];

const useInventoryReport = () => {
  const { branch } = useBranch();

  const [branchOptions, setBranchOptions] = useState([]);
  const [branchOverride, setBranchOverride] = useState("");

  // La sucursal efectiva se deriva: la seleccion explicita del usuario manda y,
  // mientras no exista, se usa la sucursal del contexto. Antes esto se resolvia
  // con un efecto que hacia setSelectedBranchId(branch.id) y provocaba un
  // re-render en cascada; ahora no hay estado que sincronizar.
  // Una terminal admin no tiene stock propio: el usuario elige la sucursal.
  const defaultBranchId = isOperationalBranch(branch) ? branch.id : "";
  const selectedBranchId = branchOverride || defaultBranchId;

  // Las filas se guardan junto con la sucursal que las produjo: ante un error
  // de recarga se conservan los ultimos datos validos de esa sucursal, pero
  // nunca se muestran bajo otra sucursal.
  const [report, setReport] = useState({ branchId: "", rows: [] });
  const [error, setError] = useState("");

  // La carga se deriva de la sucursal pedida en lugar de marcarse con un
  // setLoading(true) sincrono, que provocaba un re-render en cascada. Sin
  // sucursal la clave es null, que es justamente la clave inicial de las
  // peticiones resueltas, asi que no hay nada pendiente que mostrar.
  const requestKey = selectedBranchId || null;
  const { isLoading, isStale, markSettled } = useRequestStatus(requestKey);

  // El error de una peticion anterior no debe mostrarse mientras corre la nueva.
  const visibleError = isStale ? "" : error;

  // Sin sucursal, o mientras la sucursal pedida no tenga datos propios, la
  // tabla queda vacia.
  const rows =
    selectedBranchId && report.branchId === selectedBranchId
      ? report.rows
      : EMPTY_ROWS;

  // Cada recarga en tiempo real solo incrementa su token: la peticion vive en
  // un unico efecto por recurso, que tambien cubre la carga inicial y el
  // cambio de sucursal, y descarta respuestas de peticiones ya reemplazadas.
  const [branchesReloadToken, setBranchesReloadToken] = useState(0);
  const [inventoryReloadToken, setInventoryReloadToken] = useState(0);

  const branchesRefreshTimeoutRef = useRef(null);
  const inventoryRefreshTimeoutRef = useRef(null);
  const rowsRef = useRef(rows);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

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
  }, [branch, branchesReloadToken]);

  useEffect(() => {
    if (!selectedBranchId) {
      return undefined;
    }

    let cancelled = false;

    fetchInventoryReportRows(selectedBranchId)
      .then((inventoryRows) => {
        if (cancelled) return;
        setReport({ branchId: selectedBranchId, rows: inventoryRows });
        setError("");
        markSettled();
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.error("Error cargando reporte de inventario:", loadError);
        setError("No se pudo cargar el reporte de inventario.");
        markSettled();
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBranchId, inventoryReloadToken, markSettled]);

  useEffect(() => {
    const scheduleBranchesRefresh = () => {
      if (branchesRefreshTimeoutRef.current) {
        window.clearTimeout(branchesRefreshTimeoutRef.current);
      }

      branchesRefreshTimeoutRef.current = window.setTimeout(() => {
        setBranchesReloadToken((token) => token + 1);
      }, REALTIME_REFRESH_DELAY_MS);
    };

    const unsubscribe = subscribeToBranchListChanges({
      onChange: scheduleBranchesRefresh,
    });

    return () => {
      if (branchesRefreshTimeoutRef.current) {
        window.clearTimeout(branchesRefreshTimeoutRef.current);

        branchesRefreshTimeoutRef.current = null;
      }

      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!selectedBranchId) {
      return undefined;
    }

    const scheduleInventoryRefresh = () => {
      if (inventoryRefreshTimeoutRef.current) {
        window.clearTimeout(inventoryRefreshTimeoutRef.current);
      }

      inventoryRefreshTimeoutRef.current = window.setTimeout(() => {
        setInventoryReloadToken((token) => token + 1);
      }, REALTIME_REFRESH_DELAY_MS);
    };

    // Los filtros comparan contra las filas en pantalla al momento del
    // evento; se leen por ref para no resuscribir el canal en cada recarga.
    const unsubscribe = subscribeToInventoryReportChanges({
      branchId: selectedBranchId,
      onChange: scheduleInventoryRefresh,
      isRelevantProductChange: (payload) =>
        isRelevantProductChange(payload, rowsRef.current),
      isRelevantDepartmentChange: (payload) =>
        isRelevantDepartmentChange(payload, rowsRef.current),
    });

    return () => {
      if (inventoryRefreshTimeoutRef.current) {
        window.clearTimeout(inventoryRefreshTimeoutRef.current);

        inventoryRefreshTimeoutRef.current = null;
      }

      unsubscribe();
    };
  }, [selectedBranchId]);

  const handleBranchChange = (branchId) => {
    setBranchOverride(branchId);
  };

  return {
    branchOptions,
    selectedBranchId,
    rows,
    loading: isLoading,
    error: visibleError,
    handleBranchChange,
  };
};

export default useInventoryReport;
