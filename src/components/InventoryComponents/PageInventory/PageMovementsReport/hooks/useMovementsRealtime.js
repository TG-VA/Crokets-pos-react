import { useEffect, useRef } from "react";

import {
  FAILED_REALTIME_STATUSES,
  subscribeToMovements,
} from "../services/movementsRealtimeService";

const REALTIME_DEBOUNCE_MS = 500;
const FALLBACK_REFRESH_INTERVAL_MS = 30000;

const useMovementsRealtime = ({ selectedBranchId, reloadMovements }) => {
  const refreshTimerRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const refreshFunctionRef = useRef(reloadMovements);

  useEffect(() => {
    refreshFunctionRef.current = reloadMovements;
  }, [reloadMovements]);

  useEffect(() => {
    if (!selectedBranchId || typeof refreshFunctionRef.current !== "function") {
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

    const stopPolling = () => {
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);

        pollingIntervalRef.current = null;
      }
    };

    // El sondeo es solo un respaldo: arranca cuando el canal falla y se detiene
    // en cuanto vuelve a quedar suscrito.
    const handleStatusChange = (status) => {
      if (FAILED_REALTIME_STATUSES.has(status)) {
        if (!pollingIntervalRef.current) {
          pollingIntervalRef.current = window.setInterval(() => {
            refreshFunctionRef.current?.();
          }, FALLBACK_REFRESH_INTERVAL_MS);
        }

        return;
      }

      if (status === "SUBSCRIBED") {
        stopPolling();
      }
    };

    const unsubscribe = subscribeToMovements({
      branchId: selectedBranchId,
      onChange: queueRefresh,
      onStatusChange: handleStatusChange,
    });

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);

        refreshTimerRef.current = null;
      }

      stopPolling();

      unsubscribe();
    };
  }, [selectedBranchId]);
};

export default useMovementsRealtime;
