import { useCallback, useEffect, useState } from "react";

import { useBranch } from "../../../../../contexts/BranchContext";
import { usePendingOrders } from "../../../../../contexts/PendingOrdersContext";
import {
  fetchOrderBranchOptions,
  loadStoreOrders,
} from "../services/ordersService";
import {
  normalizeOrders,
  sortOrdersByDate,
} from "../utils/ordersCalculationService";

export const useOrdersData = () => {
  const { branch } = useBranch();
  const { refreshPendingOrders } = usePendingOrders();

  const [orders, setOrders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(branch?.id));
  const [error, setError] = useState("");

  const currentBranchId = branch?.id || "";

  const refreshData = useCallback(async ({ showLoader = true } = {}) => {
    if (showLoader) {
      setIsLoading(true);
    }

    setError("");

    try {
      const [rawOrders, branchOptions] = await Promise.all([
        loadStoreOrders(),
        fetchOrderBranchOptions(),
      ]);

      setOrders(normalizeOrders(rawOrders));
      setBranches(Array.isArray(branchOptions) ? branchOptions : []);
    } catch (err) {
      console.error("Error al cargar pedidos de abastecimiento:", err);
      setError(
        "No se pudieron cargar los pedidos. Verifica la conexion e intenta de nuevo."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await refreshData();
    };

    void run();
  }, [refreshData]);

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
