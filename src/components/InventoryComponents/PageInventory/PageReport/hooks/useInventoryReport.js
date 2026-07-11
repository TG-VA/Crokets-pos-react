import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "../../../../../lib/supabaseClient";
import { useBranch } from "../../../../../contexts/BranchContext";

import {
  fetchBranchOptions,
  fetchInventoryReportRows,
  getBranchOptionsFallback,
} from "../services/inventoryReportService";

const REALTIME_REFRESH_DELAY_MS = 250;

const useInventoryReport = () => {
  const { branch } = useBranch();

  const [branchOptions, setBranchOptions] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    if (selectedBranchId) {
      return;
    }

    if (branch?.id) {
      setSelectedBranchId(branch.id);
    }
  }, [branch?.id, selectedBranchId]);

  const loadBranches = useCallback(async () => {
    try {
      const options = await fetchBranchOptions(branch);

      if (!isMountedRef.current) {
        return;
      }

      setBranchOptions(options);
    } catch (loadError) {
      console.error(
        "Error cargando sucursales:",
        loadError
      );

      if (!isMountedRef.current) {
        return;
      }

      setBranchOptions(
        getBranchOptionsFallback(branch)
      );
    }
  }, [branch]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    const scheduleBranchesRefresh = () => {
      if (branchesRefreshTimeoutRef.current) {
        window.clearTimeout(
          branchesRefreshTimeoutRef.current
        );
      }

      branchesRefreshTimeoutRef.current =
        window.setTimeout(() => {
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
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          console.error(
            "No se pudo conectar Realtime para sucursales:",
            status
          );
        }
      });

    return () => {
      if (branchesRefreshTimeoutRef.current) {
        window.clearTimeout(
          branchesRefreshTimeoutRef.current
        );

        branchesRefreshTimeoutRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [loadBranches]);

  const loadInventoryByBranch = useCallback(
    async ({ silent = false } = {}) => {
      if (!selectedBranchId) {
        if (isMountedRef.current) {
          setRows([]);
          setError("");
          setLoading(false);
        }

        return;
      }

      const requestId =
        inventoryRequestIdRef.current + 1;

      inventoryRequestIdRef.current = requestId;

      if (!silent && isMountedRef.current) {
        setLoading(true);
      }

      if (isMountedRef.current) {
        setError("");
      }

      try {
        const inventoryRows =
          await fetchInventoryReportRows(
            selectedBranchId
          );

        const isLatestRequest =
          inventoryRequestIdRef.current === requestId;

        if (
          isMountedRef.current &&
          isLatestRequest
        ) {
          setRows(inventoryRows);
        }
      } catch (loadError) {
        console.error(
          "Error cargando reporte de inventario:",
          loadError
        );

        const isLatestRequest =
          inventoryRequestIdRef.current === requestId;

        if (
          isMountedRef.current &&
          isLatestRequest
        ) {
          setRows([]);
          setError(
            "No se pudo cargar el reporte de inventario."
          );
        }
      } finally {
        const isLatestRequest =
          inventoryRequestIdRef.current === requestId;

        if (
          !silent &&
          isMountedRef.current &&
          isLatestRequest
        ) {
          setLoading(false);
        }
      }
    },
    [selectedBranchId]
  );

  useEffect(() => {
    loadInventoryByBranch();
  }, [loadInventoryByBranch]);

  useEffect(() => {
    if (!selectedBranchId) {
      return undefined;
    }

    const scheduleInventoryRefresh = () => {
      if (inventoryRefreshTimeoutRef.current) {
        window.clearTimeout(
          inventoryRefreshTimeoutRef.current
        );
      }

      inventoryRefreshTimeoutRef.current =
        window.setTimeout(() => {
          loadInventoryByBranch({
            silent: true,
          });
        }, REALTIME_REFRESH_DELAY_MS);
    };

    const channel = supabase
      .channel(
        `inventory-report-realtime-${selectedBranchId}`
      )
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
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          console.error(
            "No se pudo conectar Realtime al reporte:",
            status
          );
        }
      });

    return () => {
      if (inventoryRefreshTimeoutRef.current) {
        window.clearTimeout(
          inventoryRefreshTimeoutRef.current
        );

        inventoryRefreshTimeoutRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [
    selectedBranchId,
    loadInventoryByBranch,
  ]);

  const handleBranchChange = (branchId) => {
    setSelectedBranchId(branchId);
  };

  return {
    branchOptions,
    selectedBranchId,
    rows,
    loading,
    error,
    handleBranchChange,
  };
};

export default useInventoryReport;