import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useBranch } from "../../../../../contexts/BranchContext";
import { useDidChange } from "../../../../../hooks/useDidChange";
import { useRequestStatus } from "../../../../../hooks/useRequestStatus";

import {
  loadMovementBranches,
  loadMovementsReport,
  POLI_BRANCH_ID,
} from "../services/movementsReportService";

import {
  createDateRange,
  dateKeyToDate,
  dateToLocalKey,
  getDateRangeForPreset,
  getTodayDateKey,
} from "../utils/movementDateUtils";

// Resuelve que sucursal queda seleccionada tras cargar el catalogo. Es pura, asi
// que la comparten la carga inicial y las recargas manuales sin duplicar reglas.
const resolveBranchSelection = (
  currentSelectedBranchId,
  branches,
  branch
) => {
  const currentBranchExists =
    branch?.id &&
    branches.some((item) => item?.id === branch.id);

  if (currentBranchExists) {
    return branch.id;
  }

  const previousBranchExists =
    currentSelectedBranchId &&
    branches.some(
      (item) => item?.id === currentSelectedBranchId
    );

  if (previousBranchExists) {
    return currentSelectedBranchId;
  }

  return branches[0]?.id || "";
};

const getBranchLabel = (branch) => {
  if (!branch) {
    return "—";
  }

  const name = String(
    branch?.name ?? ""
  ).trim();

  const code = String(
    branch?.code ?? ""
  ).trim();

  if (name && code) {
    return `${name} (${code})`;
  }

  return name || code || branch?.id || "—";
};

const useMovementsReport = () => {
  const { branch } = useBranch();

  const [branchOptions, setBranchOptions] =
    useState([]);

  const [
    selectedBranchId,
    setSelectedBranchId,
  ] = useState("");

  const [
    startDateKey,
    setStartDateKey,
  ] = useState(() =>
    getTodayDateKey()
  );

  const [
    endDateKey,
    setEndDateKey,
  ] = useState(() =>
    getTodayDateKey()
  );

  const [
    rangePreset,
    setRangePreset,
  ] = useState("today");

  const [rows, setRows] =
    useState([]);

  const [error, setError] =
    useState("");

  // La carga se deriva de la sucursal pedida en lugar de marcarse con un
  // setLoading(true) sincrono, que provocaba un re-render en cascada. Sin
  // sucursal la clave es null, que es la clave inicial de las peticiones
  // resueltas, asi que no hay nada pendiente que mostrar.
  const { isLoading, isStale, markSettled } =
    useRequestStatus(selectedBranchId || null);

  // El error de una peticion anterior no debe mostrarse mientras corre la nueva.
  const visibleError = isStale ? "" : error;

  // Sin sucursal no hay reporte que mostrar; antes se vaciaba la tabla desde
  // dentro de la carga, con lo que ademas habia que esperar un turno de render.
  const visibleRows = selectedBranchId ? rows : [];

  const loadBranches = useCallback(
    async () => {
      const branches =
        await loadMovementBranches({
          currentBranch: branch,
        });

      setBranchOptions(branches);

      setSelectedBranchId(
        (currentSelectedBranchId) =>
          resolveBranchSelection(
            currentSelectedBranchId,
            branches,
            branch
          )
      );
    },
    [
      branch?.id,
      branch?.name,
      branch?.code,
    ]
  );

  const loadMovements = useCallback(
    async () => {
      if (!selectedBranchId) {
        return [];
      }

      setError("");

      try {
        const movements =
          await loadMovementsReport({
            branchId: selectedBranchId,
          });

        setRows(movements);

        return movements;
      } catch (loadError) {
        console.error(
          "Error cargando reporte de movimientos:",
          loadError
        );

        const message =
          import.meta.env.DEV &&
          loadError?.message
            ? `No se pudo cargar el reporte de movimientos. ${loadError.message}`
            : "No se pudo cargar el reporte de movimientos.";

        setError(message);
        setRows([]);

        return [];
      } finally {
        markSettled();
      }
    },
    [selectedBranchId, markSettled]
  );

  // Los efectos llaman directo a las funciones de datos importadas y aplican el
  // estado en la continuacion asincrona; los callbacks quedan para las llamadas
  // imperativas (recarga manual y refresco).
  useEffect(() => {
    let cancelled = false;

    loadMovementBranches({
      currentBranch: branch,
    })
      .then((branches) => {
        if (cancelled) return;

        setBranchOptions(branches);
        setSelectedBranchId(
          (currentSelectedBranchId) =>
            resolveBranchSelection(
              currentSelectedBranchId,
              branches,
              branch
            )
        );
      });

    return () => {
      cancelled = true;
    };
  }, [branch?.id, branch?.name, branch?.code]);

  useEffect(() => {
    if (!selectedBranchId) {
      return undefined;
    }

    let cancelled = false;

    loadMovementsReport({
      branchId: selectedBranchId,
    })
      .then((movements) => {
        if (cancelled) return;
        setRows(movements);
        setError("");
        markSettled();
      })
      .catch((loadError) => {
        if (cancelled) return;

        console.error(
          "Error cargando reporte de movimientos:",
          loadError
        );

        setError(
          import.meta.env.DEV && loadError?.message
            ? `No se pudo cargar el reporte de movimientos. ${loadError.message}`
            : "No se pudo cargar el reporte de movimientos."
        );
        setRows([]);
        markSettled();
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBranchId, markSettled]);

  // La sucursal del contexto solo pisa la seleccion cuando aun no hay una
  // eleccion propia o cuando sigue apuntando a la sucursal "POLI". El ajuste se
  // resuelve durante el render en lugar de disparar un setState desde un efecto.
  if (useDidChange(branch?.id) && branch?.id) {
    setSelectedBranchId(
      (currentSelectedBranchId) => {
        if (
          !currentSelectedBranchId ||
          currentSelectedBranchId ===
            POLI_BRANCH_ID
        ) {
          return branch.id;
        }

        return currentSelectedBranchId;
      }
    );
  }

  const selectedBranch = useMemo(() => {
    return (
      branchOptions.find(
        (item) =>
          item?.id === selectedBranchId
      ) ?? null
    );
  }, [
    branchOptions,
    selectedBranchId,
  ]);

  const selectedBranchLabel =
    useMemo(() => {
      if (selectedBranch) {
        return getBranchLabel(
          selectedBranch
        );
      }

      return selectedBranchId || "—";
    }, [
      selectedBranch,
      selectedBranchId,
    ]);

  const startDateValue = useMemo(() => {
    return dateKeyToDate(startDateKey);
  }, [startDateKey]);

  const endDateValue = useMemo(() => {
    return dateKeyToDate(endDateKey);
  }, [endDateKey]);

  const currentRange = useMemo(() => {
    return createDateRange(
      startDateKey,
      endDateKey
    );
  }, [
    startDateKey,
    endDateKey,
  ]);

  const handleStartDateChange =
    useCallback((date) => {
      const validDate =
        date instanceof Date &&
        !Number.isNaN(
          date.getTime()
        )
          ? date
          : new Date();

      const nextStartDateKey =
        dateToLocalKey(validDate);

      setStartDateKey(
        nextStartDateKey
      );

      setEndDateKey(
        (currentEndDateKey) =>
          currentEndDateKey <
          nextStartDateKey
            ? nextStartDateKey
            : currentEndDateKey
      );

      setRangePreset("custom");
    }, []);

  const handleEndDateChange =
    useCallback((date) => {
      const validDate =
        date instanceof Date &&
        !Number.isNaN(
          date.getTime()
        )
          ? date
          : new Date();

      const nextEndDateKey =
        dateToLocalKey(validDate);

      setEndDateKey(
        nextEndDateKey
      );

      setStartDateKey(
        (currentStartDateKey) =>
          currentStartDateKey >
          nextEndDateKey
            ? nextEndDateKey
            : currentStartDateKey
      );

      setRangePreset("custom");
    }, []);

  const selectRangePreset =
    useCallback((preset) => {
      const todayKey =
        getTodayDateKey();

      const normalizedPreset =
        preset === "week" ||
        preset === "month"
          ? preset
          : "day";

      const range =
        getDateRangeForPreset(
          todayKey,
          normalizedPreset
        );

      if (!range) {
        return;
      }

      setStartDateKey(
        range.startKey
      );

      setEndDateKey(
        range.endKey
      );

      setRangePreset(
        normalizedPreset === "day"
          ? "today"
          : normalizedPreset
      );
    }, []);

  const refreshMovements =
    useCallback(() => {
      return loadMovements({
        silent: false,
      });
    }, [loadMovements]);

  const refreshMovementsSilently =
    useCallback(() => {
      return loadMovements({
        silent: true,
      });
    }, [loadMovements]);

  return {
    branchOptions,
    selectedBranchId,
    selectedBranch,
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
    setStartDateKey,
    setEndDateKey,
    setRangePreset,

    handleStartDateChange,
    handleEndDateChange,
    selectRangePreset,

    loadBranches,
    loadMovements,
    refreshMovements,
    refreshMovementsSilently,
  };
};

export default useMovementsReport;
