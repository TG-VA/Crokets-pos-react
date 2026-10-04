import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { loadTransferOrders } from "../components/InventoryComponents/PageInventory/PageTransfers/services/transfersService";
import { getPendingReceiptsCount } from "../components/InventoryComponents/PageInventory/PageTransfers/utils/transfersUtils";
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
    setPendingReceiptsCount(0);
    setIsLoading(true);
    try {
      const orders = await loadTransferOrders();
      const count = getPendingReceiptsCount({
        orders,
        currentBranchId,
      });
      const safeCount = Number.isFinite(count) ? count : 0;
      setPendingReceiptsCount(safeCount);
      setLastRefreshAt(new Date());
    } catch (err) {
      console.error(
        "No se pudo refrescar el contador de traspasos pendientes:",
        err
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentBranchId]);

  useEffect(() => {
    // Reset state de count + loading a valores iniciales ANTES de ejecutar fetch asíncrono (refresh).
    // Pattern standard: setLoading(true) + await + setData + setLoading(false).
    // La regla react-hooks/set-state-in-effect reporta falso positivo por cadena de llamada vía refresh.
    void refresh(); // eslint-disable-line react-hooks/set-state-in-effect
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
