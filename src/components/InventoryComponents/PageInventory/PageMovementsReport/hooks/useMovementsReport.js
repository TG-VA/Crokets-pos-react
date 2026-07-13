import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useBranch } from "../../../../../contexts/BranchContext";

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

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadBranches = useCallback(
    async () => {
      const branches =
        await loadMovementBranches({
          currentBranch: branch,
        });

      setBranchOptions(branches);

      setSelectedBranchId(
        (currentSelectedBranchId) => {
          const currentBranchExists =
            branch?.id &&
            branches.some(
              (item) =>
                item?.id === branch.id
            );

          if (currentBranchExists) {
            return branch.id;
          }

          const previousBranchExists =
            currentSelectedBranchId &&
            branches.some(
              (item) =>
                item?.id ===
                currentSelectedBranchId
            );

          if (previousBranchExists) {
            return currentSelectedBranchId;
          }

          return branches[0]?.id || "";
        }
      );
    },
    [
      branch?.id,
      branch?.name,
      branch?.code,
    ]
  );

  const loadMovements = useCallback(
    async ({ silent = false } = {}) => {
      if (!selectedBranchId) {
        setRows([]);
        return [];
      }

      if (!silent) {
        setLoading(true);
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
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [selectedBranchId]
  );

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    if (!selectedBranchId) {
      return;
    }

    loadMovements();
  }, [
    selectedBranchId,
    loadMovements,
  ]);

  useEffect(() => {
    if (!branch?.id) {
      return;
    }

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
  }, [branch?.id]);

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

    rows,
    loading,
    error,

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