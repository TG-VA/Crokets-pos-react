import { useEffect, useRef } from "react";

import { supabase } from "../../../../../lib/supabaseClient";

import {
  INVENTORY_MOVEMENTS_TABLE,
  REWARD_REDEMPTIONS_TABLE,
} from "../services/movementsReportService";

const REALTIME_DEBOUNCE_MS = 500;
const FALLBACK_REFRESH_INTERVAL_MS = 30000;

const useMovementsRealtime = ({
  selectedBranchId,
  refreshMovementsSilently,
  enabled = true,
}) => {
  const refreshTimerRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const refreshFunctionRef = useRef(
    refreshMovementsSilently
  );

  useEffect(() => {
    refreshFunctionRef.current =
      refreshMovementsSilently;
  }, [refreshMovementsSilently]);

  useEffect(() => {
    if (
      !enabled ||
      !selectedBranchId ||
      typeof refreshFunctionRef.current !==
        "function"
    ) {
      return undefined;
    }

    const queueRefresh = () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(
          refreshTimerRef.current
        );
      }

      refreshTimerRef.current =
        window.setTimeout(() => {
          refreshFunctionRef.current?.();
        }, REALTIME_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(
        `movements-report-realtime-${selectedBranchId}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: INVENTORY_MOVEMENTS_TABLE,
          filter: `branch_id=eq.${selectedBranchId}`,
        },
        queueRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: REWARD_REDEMPTIONS_TABLE,
          filter: `branch_id=eq.${selectedBranchId}`,
        },
        queueRefresh
      )
      .subscribe((status) => {
        if (
          import.meta.env.DEV &&
          status === "CHANNEL_ERROR"
        ) {
          console.error(
            "Error en realtime del reporte de movimientos."
          );
        }
      });

    pollingIntervalRef.current =
      window.setInterval(() => {
        refreshFunctionRef.current?.();
      }, FALLBACK_REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(
          refreshTimerRef.current
        );

        refreshTimerRef.current = null;
      }

      if (pollingIntervalRef.current) {
        window.clearInterval(
          pollingIntervalRef.current
        );

        pollingIntervalRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [enabled, selectedBranchId]);
};

export default useMovementsRealtime;