import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { countPendingStoreOrders } from "../components/InventoryComponents/PageInventory/PageOrders/services/ordersService";
import { subscribeToStoreOrderChanges } from "../services/inventory/ordersRealtimeService";
import { isNetworkError } from "../utils/isNetworkError";
import { useBranch } from "./BranchContext";

const POLL_MS = 30 * 1000;

const PendingOrdersContext = createContext(null);

export const usePendingOrders = () => {
  const ctx = useContext(PendingOrdersContext);

  if (!ctx) {
    throw new Error(
      "usePendingOrders debe usarse dentro de <PendingOrdersProvider />"
    );
  }

  return ctx;
};

export const PendingOrdersProvider = ({ children }) => {
  const { branch } = useBranch();
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshAt, setLastRefreshAt] = useState(null);

  const currentBranchId = branch?.id || "";

  const refresh = useCallback(async () => {
    if (!currentBranchId) {
      setPendingOrdersCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const count = await countPendingStoreOrders(currentBranchId);

      setPendingOrdersCount(count);
      setLastRefreshAt(new Date());
    } catch (err) {
      const isSchemaMissing = err?.code === "PGRST205" || err?.status === 404;
      const isNet = isNetworkError(err);

      if (isSchemaMissing || isNet) {
        return;
      }

      console.error("Error al refrescar pedidos pendientes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentBranchId]);

  useEffect(() => {
    setPendingOrdersCount(0); // eslint-disable-line react-hooks/set-state-in-effect -- reset acotado al cambio de sucursal
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refresh();
    }, POLL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    if (!currentBranchId) return undefined;

    return subscribeToStoreOrderChanges({
      channelName: `pending-orders-${currentBranchId}`,
      onChange: () => {
        void refresh();
      },
    });
  }, [currentBranchId, refresh]);

  const value = useMemo(
    () => ({
      pendingOrdersCount,
      isLoading,
      lastRefreshAt,
      refreshPendingOrders: refresh,
    }),
    [isLoading, lastRefreshAt, pendingOrdersCount, refresh]
  );

  return (
    <PendingOrdersContext.Provider value={value}>
      {children}
    </PendingOrdersContext.Provider>
  );
};

export default PendingOrdersContext;
