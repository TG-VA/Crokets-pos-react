import { useEffect, useRef } from "react";

import { subscribeToMovements } from "../services/movementsRealtimeService";

const REALTIME_DEBOUNCE_MS = 500;
const FALLBACK_REFRESH_INTERVAL_MS = 30000;

const useMovementsRealtime = ({
  selectedBranchId,
  reloadMovements,
  enabled = true,
}) => {
  const refreshTimerRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const refreshFunctionRef = useRef(reloadMovements);

  useEffect(() => {
    refreshFunctionRef.current = reloadMovements;
  }, [reloadMovements]);

  useEffect(() => {
    if (
      !enabled ||
      !selectedBranchId ||
      typeof refreshFunctionRef.current !== "function"
    ) {
      return undefined;
    }

    const queueRefresh = () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(() => {
        refreshFunctionRef.current?.();
      }, REALTIME_DEBOUNCE_MS);
    };

    const unsubscribe = subscribeToMovements({
      branchId: selectedBranchId,
      onChange: queueRefresh,
    });

    pollingIntervalRef.current = window.setInterval(() => {
      refreshFunctionRef.current?.();
    }, FALLBACK_REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);

        refreshTimerRef.current = null;
      }

      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);

        pollingIntervalRef.current = null;
      }

      unsubscribe();
    };
  }, [enabled, selectedBranchId]);
};

export default useMovementsRealtime;
