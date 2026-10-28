import { useCallback, useEffect, useRef, useState } from "react";

import { useBranch } from "../../../../../contexts/BranchContext";
import { usePendingOrders } from "../../../../../contexts/PendingOrdersContext";
import {
  fetchOrderBranchOptions,
  loadStoreOrders,
} from "../services/ordersService";
import { subscribeToStoreOrderChanges } from "../../../../../services/inventory/ordersRealtimeService";
import {
  normalizeOrders,
  sortOrdersByDate,
} from "../utils/ordersCalculationService";

const REALTIME_DEBOUNCE_MS = 300;

export const useOrdersData = () => {
  const { branch } = useBranch();
  const { refreshPendingOrders } = usePendingOrders();

  const [orders, setOrders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(branch?.id));
  const [error, setError] = useState("");

  const currentBranchId = branch?.id || "";
  const latestRequestRef = useRef(0);

  const refreshData = useCallback(
    async ({ showLoader = true } = {}) => {
      const requestId = latestRequestRef.current + 1;
      latestRequestRef.current = requestId;

      if (showLoader) {
        setIsLoading(true);
      }

      try {
        const [ordersResult, branchesResult] = await Promise.allSettled([
          loadStoreOrders(),
          fetchOrderBranchOptions(branch),
        ]);

        if (requestId !== latestRequestRef.current) return;

        if (branchesResult.status === "fulfilled") {
          setBranches(
            Array.isArray(branchesResult.value) ? branchesResult.value : []
          );
        }

        if (ordersResult.status === "rejected") {
          throw ordersResult.reason;
        }

        setOrders(normalizeOrders(ordersResult.value));
        setError("");
      } catch (err) {
        console.error("Error al cargar pedidos de abastecimiento:", err);

        if (showLoader && requestId === latestRequestRef.current) {
          setError(
            "No se pudieron cargar los pedidos. Verifica la conexión e intenta de nuevo."
          );
        }
      } finally {
        if (requestId === latestRequestRef.current) {
          setIsLoading(false);
        }
      }
    },
    [branch]
  );

  useEffect(() => {
    const run = async () => {
      await refreshData();
    };

    void run();
  }, [refreshData]);

  const refreshDataRef = useRef(refreshData);

  useEffect(() => {
    refreshDataRef.current = refreshData;
  });

  useEffect(() => {
    if (!currentBranchId) return undefined;

    let timer = null;

    const unsubscribe = subscribeToStoreOrderChanges({
      channelName: `orders-data-${currentBranchId}`,
      onChange: () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          void refreshDataRef.current({ showLoader: false });
        }, REALTIME_DEBOUNCE_MS);
      },
    });

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [currentBranchId]);

  const upsertOrder = useCallback((updatedOrder) => {
    if (!updatedOrder?.id) return;

    setOrders((previous) => {
      const exists = previous.some((order) => order.id === updatedOrder.id);

      return sortOrdersByDate(
        exists
          ? previous.map((order) =>
              order.id === updatedOrder.id ? updatedOrder : order
            )
          : [updatedOrder, ...previous]
      );
    });
  }, []);

  const syncAfterMutation = useCallback(async () => {
    await refreshData({ showLoader: false });
    await refreshPendingOrders();
  }, [refreshData, refreshPendingOrders]);

  return {
    orders,
    branches,
    isLoading,
    error,
    currentBranchId,
    refreshData,
    syncAfterMutation,
    upsertOrder,
  };
};
