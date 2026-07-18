import {
  useEffect,
  useRef,
} from "react";

import {
  supabase,
} from "../../../../../lib/supabaseClient";

import {
  KARDEX_MOVEMENTS_TABLE,
} from "../services/kardexService";

const REALTIME_DEBOUNCE_MS =
  500;

const FALLBACK_REFRESH_INTERVAL_MS =
  30000;

const EMPTY_SELECTED_PRODUCT_IDS = [
  null,
  null,
];

const useKardexRealtime = ({
  branchId = null,
  selectedProductIds = [],
  refreshSlotSilently,
  enabled = true,
} = {}) => {
  const refreshFunctionRef =
    useRef(
      refreshSlotSilently
    );

  const selectedProductIdsRef =
    useRef(
      EMPTY_SELECTED_PRODUCT_IDS
    );

  const refreshTimersRef =
    useRef([
      null,
      null,
    ]);

  const pollingIntervalRef =
    useRef(null);

  useEffect(() => {
    refreshFunctionRef.current =
      refreshSlotSilently;
  }, [refreshSlotSilently]);

  useEffect(() => {
    selectedProductIdsRef.current =
      Array.isArray(
        selectedProductIds
      )
        ? selectedProductIds
        : EMPTY_SELECTED_PRODUCT_IDS;
  }, [selectedProductIds]);

  const selectedIdsKey =
    Array.isArray(
      selectedProductIds
    )
      ? selectedProductIds
          .map((productId) =>
            String(
              productId ?? ""
            )
          )
          .join("|")
      : "";

  useEffect(() => {
    if (
      !enabled ||
      !branchId ||
      typeof refreshFunctionRef.current !==
        "function"
    ) {
      return undefined;
    }

    const clearSlotTimer = (
      slot
    ) => {
      const timerId =
        refreshTimersRef.current[
          slot
        ];

      if (timerId === null) {
        return;
      }

      window.clearTimeout(
        timerId
      );

      refreshTimersRef.current[
        slot
      ] = null;
    };

    const refreshSlotSafely = (
      slot
    ) => {
      Promise.resolve(
        refreshFunctionRef.current?.(
          slot
        )
      ).catch((error) => {
        if (import.meta.env.DEV) {
          console.error(
            "Error actualizando el Kardex en segundo plano:",
            error
          );
        }
      });
    };

    const queueSlotRefresh = (
      slot
    ) => {
      clearSlotTimer(
        slot
      );

      refreshTimersRef.current[
        slot
      ] = window.setTimeout(
        () => {
          refreshTimersRef.current[
            slot
          ] = null;

          refreshSlotSafely(
            slot
          );
        },
        REALTIME_DEBOUNCE_MS
      );
    };

    const queueAffectedProducts = (
      payload
    ) => {
      const changedProductId =
        payload?.new?.product_id ??
        payload?.old?.product_id ??
        null;

      const currentProductIds =
        selectedProductIdsRef.current;

      if (!changedProductId) {
        currentProductIds.forEach(
          (
            productId,
            slot
          ) => {
            if (productId) {
              queueSlotRefresh(
                slot
              );
            }
          }
        );

        return;
      }

      currentProductIds.forEach(
        (
          productId,
          slot
        ) => {
          if (
            productId &&
            String(productId) ===
              String(
                changedProductId
              )
          ) {
            queueSlotRefresh(
              slot
            );
          }
        }
      );
    };

    const channel =
      supabase
        .channel(
          `kardex-realtime-${branchId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              KARDEX_MOVEMENTS_TABLE,
            filter:
              `branch_id=eq.${branchId}`,
          },
          queueAffectedProducts
        )
        .subscribe((status) => {
  if (!import.meta.env.DEV) {
    return;
  }

  if (status === "SUBSCRIBED") {
    console.log(
      "Realtime del Kardex activo."
    );

    return;
  }

  if (
    status === "CHANNEL_ERROR" ||
    status === "TIMED_OUT"
  ) {
    console.error(
      `Error en Realtime del Kardex: ${status}`
    );
  }
});

    pollingIntervalRef.current =
      window.setInterval(
        () => {
          selectedProductIdsRef.current.forEach(
            (
              productId,
              slot
            ) => {
              if (productId) {
                refreshSlotSafely(
                  slot
                );
              }
            }
          );
        },
        FALLBACK_REFRESH_INTERVAL_MS
      );

    return () => {
      refreshTimersRef.current.forEach(
        (
          _timerId,
          slot
        ) => {
          clearSlotTimer(
            slot
          );
        }
      );

      if (
        pollingIntervalRef.current !==
        null
      ) {
        window.clearInterval(
          pollingIntervalRef.current
        );

        pollingIntervalRef.current =
          null;
      }

      supabase.removeChannel(
        channel
      );
    };
  }, [
    branchId,
    enabled,
    selectedIdsKey,
  ]);
};

export default useKardexRealtime;