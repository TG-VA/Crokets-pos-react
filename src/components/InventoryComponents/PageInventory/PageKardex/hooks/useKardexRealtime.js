import { useEffect, useRef } from "react";

import { supabase } from "../../../../../lib/supabaseClient";

import { KARDEX_MOVEMENTS_TABLE } from "../services/kardexService";

const REALTIME_DEBOUNCE_MS = 500;

const FALLBACK_REFRESH_INTERVAL_MS = 30000;

const FAILED_REALTIME_STATUSES = new Set(["CHANNEL_ERROR", "TIMED_OUT"]);

const EMPTY_SELECTED_PRODUCT_IDS = [null, null];

const useKardexRealtime = ({
  branchId = null,
  selectedProductIds = [],
  refreshSlotSilently,
  enabled = true,
} = {}) => {
  const refreshFunctionRef = useRef(refreshSlotSilently);

  const selectedProductIdsRef = useRef(EMPTY_SELECTED_PRODUCT_IDS);

  const refreshTimersRef = useRef([null, null]);

  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    refreshFunctionRef.current = refreshSlotSilently;
  }, [refreshSlotSilently]);

  useEffect(() => {
    selectedProductIdsRef.current = Array.isArray(selectedProductIds)
      ? selectedProductIds
      : EMPTY_SELECTED_PRODUCT_IDS;
  }, [selectedProductIds]);

  const selectedIdsKey = Array.isArray(selectedProductIds)
    ? selectedProductIds.map((productId) => String(productId ?? "")).join("|")
    : "";

  useEffect(() => {
    if (
      !enabled ||
      !branchId ||
      typeof refreshFunctionRef.current !== "function"
    ) {
      return undefined;
    }

    const clearSlotTimer = (slot) => {
      const timerId = refreshTimersRef.current[slot];

      if (timerId === null) {
        return;
      }

      window.clearTimeout(timerId);

      refreshTimersRef.current[slot] = null;
    };

    const refreshSlotSafely = (slot) => {
      Promise.resolve(refreshFunctionRef.current?.(slot)).catch((error) => {
        console.error("Error actualizando el Kardex en segundo plano:", error);
      });
    };

    const queueSlotRefresh = (slot) => {
      clearSlotTimer(slot);

      refreshTimersRef.current[slot] = window.setTimeout(() => {
        refreshTimersRef.current[slot] = null;

        refreshSlotSafely(slot);
      }, REALTIME_DEBOUNCE_MS);
    };

    const queueAffectedProducts = (payload) => {
      const changedProductId =
        payload?.new?.product_id ?? payload?.old?.product_id ?? null;

      const currentProductIds = selectedProductIdsRef.current;

      if (!changedProductId) {
        currentProductIds.forEach((productId, slot) => {
          if (productId) {
            queueSlotRefresh(slot);
          }
        });

        return;
      }

      currentProductIds.forEach((productId, slot) => {
        if (productId && String(productId) === String(changedProductId)) {
          queueSlotRefresh(slot);
        }
      });
    };

    const refreshSelectedSlots = () => {
      selectedProductIdsRef.current.forEach((productId, slot) => {
        if (productId) {
          refreshSlotSafely(slot);
        }
      });
    };

    const stopPolling = () => {
      if (pollingIntervalRef.current !== null) {
        window.clearInterval(pollingIntervalRef.current);

        pollingIntervalRef.current = null;
      }
    };

    // El sondeo es solo un respaldo: arranca cuando el canal falla y se detiene
    // en cuanto vuelve a quedar suscrito.
    const handleStatusChange = (status) => {
      if (FAILED_REALTIME_STATUSES.has(status)) {
        console.error(`Error en Realtime del Kardex: ${status}`);

        if (pollingIntervalRef.current === null) {
          pollingIntervalRef.current = window.setInterval(
            refreshSelectedSlots,
            FALLBACK_REFRESH_INTERVAL_MS
          );
        }

        return;
      }

      if (status === "SUBSCRIBED") {
        // Los eventos emitidos con el canal caido no se reenvian: si veniamos de
        // un fallo, se recarga una vez para cubrir ese hueco.
        if (pollingIntervalRef.current !== null) {
          refreshSelectedSlots();
        }

        stopPolling();
      }
    };

    const channel = supabase
      .channel(`kardex-realtime-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: KARDEX_MOVEMENTS_TABLE,
          filter: `branch_id=eq.${branchId}`,
        },
        queueAffectedProducts
      )
      .subscribe(handleStatusChange);

    return () => {
      refreshTimersRef.current.forEach((_timerId, slot) => {
        clearSlotTimer(slot);
      });

      stopPolling();

      supabase.removeChannel(channel);
    };
  }, [branchId, enabled, selectedIdsKey]);
};

export default useKardexRealtime;
