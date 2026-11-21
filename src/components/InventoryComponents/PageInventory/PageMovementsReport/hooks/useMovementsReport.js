import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useBranch } from "../../../../../contexts/BranchContext";
import { useDidChange } from "../../../../../hooks/useDidChange";
import { useRequestStatus } from "../../../../../hooks/useRequestStatus";

import {
  loadMovementBranches,
  loadMovementsReport,
} from "../services/movementsReportService";
import { POLI_BRANCH_ID } from "../services/movementServiceConstants";

import {
  createDateRange,
  dateKeyToDate,
  dateToLocalKey,
  getDateRangeForPreset,
  getTodayDateKey,
} from "../utils/movementDateUtils";

// Resuelve que sucursal queda seleccionada tras cargar el catalogo. Es pura, asi
// que la comparten la carga inicial y las recargas manuales sin duplicar reglas.
const resolveBranchSelection = (currentSelectedBranchId, branches, branch) => {
  const currentBranchExists =
    branch?.id && branches.some((item) => item?.id === branch.id);

  if (currentBranchExists) {
    return branch.id;
  }

  const previousBranchExists =
    currentSelectedBranchId &&
    branches.some((item) => item?.id === currentSelectedBranchId);

  if (previousBranchExists) {
    return currentSelectedBranchId;
  }

  return branches[0]?.id || "";
};

const getBranchLabel = (branch) => {
  if (!branch) {
    return "—";
  }

  const name = String(branch?.name ?? "").trim();

  const code = String(branch?.code ?? "").trim();

  if (name && code) {
    return `${name} (${code})`;
  }

  return name || code || branch?.id || "—";
};

const useMovementsReport = () => {
  const { branch } = useBranch();

  const [branchOptions, setBranchOptions] = useState([]);

  const [selectedBranchId, setSelectedBranchId] = useState("");

  const [startDateKey, setStartDateKey] = useState(() => getTodayDateKey());

  const [endDateKey, setEndDateKey] = useState(() => getTodayDateKey());

  const [rangePreset, setRangePreset] = useState("today");

  const [rows, setRows] = useState([]);

  const [error, setError] = useState("");

  // La carga se deriva de la sucursal y el rango pedidos en lugar de marcarse
  // con un setLoading(true) sincrono, que provocaba un re-render en cascada.
  // Sin sucursal la clave es null, que es la clave inicial de las peticiones
  // resueltas, asi que no hay nada pendiente que mostrar.
  const { isLoading, isStale, markSettled } = useRequestStatus(
    selectedBranchId
      ? `${selectedBranchId}|${startDateKey}|${endDateKey}`
      : null
  );

  // El error de una peticion anterior no debe mostrarse mientras corre la nueva.
  const visibleError = isStale ? "" : error;

  // Sin sucursal no hay reporte que mostrar; antes se vaciaba la tabla desde
  // dentro de la carga, con lo que ademas habia que esperar un turno de render.
  const visibleRows = selectedBranchId ? rows : [];

  // El efecto de sucursales llama directo a la funcion de datos y aplica el
  // estado en la continuacion asincrona.
  useEffect(() => {
    let cancelled = false;

    loadMovementBranches({
      currentBranch: branch,
    }).then((branches) => {
      if (cancelled) return;

      setBranchOptions(branches);
      setSelectedBranchId((currentSelectedBranchId) =>
        resolveBranchSelection(currentSelectedBranchId, branches, branch)
      );
    });

    return () => {
      cancelled = true;
    };
  }, [branch?.id, branch?.name, branch?.code]);

  // Cada carga toma un numero de peticion; una respuesta que llega cuando ya
  // hay otra mas nueva (cambio de sucursal o de rango, refresco en tiempo
  // real) se descarta para no pisar los datos vigentes.
  const latestRequestRef = useRef(0);

  // La consulta no toca estado; el resultado se aplica en la continuacion
  // asincrona, igual desde el efecto que desde un refresco en tiempo real.
  const fetchMovements = useCallback(() => {
    latestRequestRef.current += 1;
    const requestId = latestRequestRef.current;

    return loadMovementsReport({
      branchId: selectedBranchId,
      startDateKey,
      endDateKey,
    }).then(
      (movements) => ({ requestId, movements, loadError: null }),
      (loadError) => ({ requestId, movements: [], loadError })
    );
  }, [selectedBranchId, startDateKey, endDateKey]);

  const applyMovements = useCallback(
    ({ requestId, movements, loadError }) => {
      if (requestId !== latestRequestRef.current) return;

      if (loadError) {
        console.error("Error cargando reporte de movimientos:", loadError);

        setError(
          import.meta.env.DEV && loadError?.message
            ? `No se pudo cargar el reporte de movimientos. ${loadError.message}`
            : "No se pudo cargar el reporte de movimientos."
        );
      } else {
        setError("");
      }

      setRows(movements);
      markSettled();
    },
    [markSettled]
  );

  useEffect(() => {
    if (!selectedBranchId) {
      return undefined;
    }

    fetchMovements().then(applyMovements);

    return () => {
      latestRequestRef.current += 1;
    };
  }, [selectedBranchId, fetchMovements, applyMovements]);

  const reloadMovements = useCallback(() => {
    if (!selectedBranchId) {
      return Promise.resolve();
    }

    return fetchMovements().then(applyMovements);
  }, [selectedBranchId, fetchMovements, applyMovements]);

  // La sucursal del contexto solo pisa la seleccion cuando aun no hay una
  // eleccion propia o cuando sigue apuntando a la sucursal "POLI". El ajuste se
  // resuelve durante el render en lugar de disparar un setState desde un efecto.
  if (useDidChange(branch?.id) && branch?.id) {
    setSelectedBranchId((currentSelectedBranchId) => {
      if (
        !currentSelectedBranchId ||
        currentSelectedBranchId === POLI_BRANCH_ID
      ) {
        return branch.id;
      }

      return currentSelectedBranchId;
    });
  }

  const selectedBranch = useMemo(() => {
    return branchOptions.find((item) => item?.id === selectedBranchId) ?? null;
  }, [branchOptions, selectedBranchId]);

  const selectedBranchLabel = useMemo(() => {
    if (selectedBranch) {
      return getBranchLabel(selectedBranch);
    }

    return selectedBranchId || "—";
  }, [selectedBranch, selectedBranchId]);

  const startDateValue = useMemo(() => {
    return dateKeyToDate(startDateKey);
  }, [startDateKey]);

  const endDateValue = useMemo(() => {
    return dateKeyToDate(endDateKey);
  }, [endDateKey]);

  const currentRange = useMemo(() => {
    return createDateRange(startDateKey, endDateKey);
  }, [startDateKey, endDateKey]);

  const handleStartDateChange = useCallback((date) => {
    const validDate =
      date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();

    const nextStartDateKey = dateToLocalKey(validDate);

    setStartDateKey(nextStartDateKey);

    setEndDateKey((currentEndDateKey) =>
      currentEndDateKey < nextStartDateKey
        ? nextStartDateKey
        : currentEndDateKey
    );

    setRangePreset("custom");
  }, []);

  const handleEndDateChange = useCallback((date) => {
    const validDate =
      date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();

    const nextEndDateKey = dateToLocalKey(validDate);

    setEndDateKey(nextEndDateKey);

    setStartDateKey((currentStartDateKey) =>
      currentStartDateKey > nextEndDateKey
        ? nextEndDateKey
        : currentStartDateKey
    );

    setRangePreset("custom");
  }, []);

  const selectRangePreset = useCallback((preset) => {
    const todayKey = getTodayDateKey();

    const normalizedPreset =
      preset === "week" || preset === "month" ? preset : "day";

    const range = getDateRangeForPreset(todayKey, normalizedPreset);

    if (!range) {
      return;
    }

    setStartDateKey(range.startKey);

    setEndDateKey(range.endKey);

    setRangePreset(normalizedPreset === "day" ? "today" : normalizedPreset);
  }, []);

  return {
    branchOptions,
    selectedBranchId,
    selectedBranchLabel,

    startDateKey,
    endDateKey,
    startDateValue,
    endDateValue,
    rangePreset,
    currentRange,

    rows: visibleRows,
    loading: isLoading,
    error: visibleError,

    setSelectedBranchId,

    handleStartDateChange,
    handleEndDateChange,
    selectRangePreset,

    reloadMovements,
  };
};

export default useMovementsReport;
