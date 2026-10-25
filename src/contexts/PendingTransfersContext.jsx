import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { loadTransferOrders } from "../components/InventoryComponents/PageInventory/PageTransfers/services/transfersService";
import { getPendingReceiptsCount } from "../components/InventoryComponents/PageInventory/PageTransfers/utils/transfersUtils";
import { isNetworkError } from "../utils/isNetworkError";
import { useBranch } from "./BranchContext";

const POLL_MS = 10 * 1000;

const PendingTransfersContext = createContext(null);

export const usePendingTransfers = () => {
  const ctx = useContext(PendingTransfersContext);
  if (!ctx) {
    throw new Error(
      "usePendingTransfers debe usarse dentro de <PendingTransfersProvider />"
    );
  }
  return ctx;
};

export const PendingTransfersProvider = ({ children }) => {
  const { branch } = useBranch();
  const [pendingReceiptsCount, setPendingReceiptsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshAt, setLastRefreshAt] = useState(null);

  const currentBranchId = branch?.id || "";

  const refresh = useCallback(async () => {
    if (!currentBranchId) {
      setPendingReceiptsCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const orders = await loadTransferOrders();
      const count = getPendingReceiptsCount({ orders, currentBranchId });
      setPendingReceiptsCount(count);
      setLastRefreshAt(new Date());
    } catch (err) {
      const isSchemaMissing = err?.code === "PGRST205" || err?.status === 404;
      const isNet = isNetworkError(err);

      if (isSchemaMissing || isNet) {
        return;
      }

      console.error("Error al refrescar recepciones pendientes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentBranchId]);

  useEffect(() => {
    // Reset del conteo solo al montar o al cambiar de sucursal (identidad de refresh),
    // NO en cada poll: resetear dentro de refresh hacía parpadear el badge a 0 cada
    // POLL_MS mientras se resolvía la petición.
    setPendingReceiptsCount(0); // eslint-disable-line react-hooks/set-state-in-effect -- reset acotado a cambio de sucursal, no al poll
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let interval = null;
    interval = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({
      pendingReceiptsCount,
      isLoading,
      lastRefreshAt,
      refreshPendingTransfers: refresh,
    }),
    [isLoading, lastRefreshAt, pendingReceiptsCount, refresh]
  );

  return (
    <PendingTransfersContext.Provider value={value}>
      {children}
    </PendingTransfersContext.Provider>
  );
};

export default PendingTransfersContext;
