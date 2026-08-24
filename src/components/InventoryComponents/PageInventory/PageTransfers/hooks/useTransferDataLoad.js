import { useCallback, useEffect, useMemo, useState } from "react";

import {
  cancelTransferOrder,
  fetchTransferBranchOptions,
  loadTransferOrders,
} from "../services/transfersService";
import {
  getPendingReceiptOrders,
  getPendingReceiptsCount,
  getTransferMetrics,
  getTransfersHistory,
} from "../utils/transfersUtils";

const DEFAULT_TAB = "send";

const useTransferDataLoad = ({
  branch,
  user,
  refreshProducts,
  clearFeedback,
  setSuccess,
  setError,
}) => {
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);
  const [branchOptions, setBranchOptions] = useState([]);
  const [transferOrders, setTransferOrders] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadBranches = useCallback(async () => {
    setLoadingBranches(true);

    try {
      const options = await fetchTransferBranchOptions(branch);
      setBranchOptions(options);
    } finally {
      setLoadingBranches(false);
    }
  }, [branch]);

  const reloadOrders = useCallback(async () => {
    try {
      const orders = await loadTransferOrders();
      setTransferOrders(orders);
    } catch (loadError) {
      console.error("No se pudieron cargar los traspasos:", loadError);
      setError(
        loadError?.message ||
          "No se pudieron cargar los traspasos desde Supabase."
      );
    }
  }, [setError]);

  const reloadProductsSilently = useCallback(async () => {
    try {
      if (typeof refreshProducts === "function") {
        await refreshProducts();
      }
    } catch (err) {
      console.error(
        "No se pudo refrescar ProductsContext durante el poll:",
        err
      );
    }
  }, [refreshProducts]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    reloadOrders();
  }, [reloadOrders]);

  useEffect(() => {
    let interval = null;
    const runLoop = async () => {
      try {
        await Promise.all([reloadOrders(), reloadProductsSilently()]);
      } catch (err) {
        console.error(
          "Polling automático traspasos/inventario falló:",
          err
        );
      }
    };

    interval = setInterval(runLoop, 10 * 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [reloadOrders, reloadProductsSilently]);

  const destinationOptions = useMemo(() => {
    return branchOptions.filter((option) => option.id !== branch?.id);
  }, [branch?.id, branchOptions]);

  const pendingReceiptOrders = useMemo(() => {
    return getPendingReceiptOrders({
      orders: transferOrders,
      currentBranchId: branch?.id || "",
    });
  }, [branch?.id, transferOrders]);

  const transferHistory = useMemo(() => {
    return getTransfersHistory({
      orders: transferOrders,
      currentBranchId: branch?.id || "",
    });
  }, [branch?.id, transferOrders]);

  const pendingReceiptsCount = useMemo(() => {
    return getPendingReceiptsCount({
      orders: transferOrders,
      currentBranchId: branch?.id || "",
    });
  }, [branch?.id, transferOrders]);

  const transferMetrics = useMemo(() => {
    return getTransferMetrics({
      orders: transferOrders,
      currentBranchId: branch?.id || "",
    });
  }, [branch?.id, transferOrders]);

  const cancellableTransferIds = useMemo(() => {
    return new Set(
      transferHistory
        .filter(
          (order) =>
            order.originBranchId === branch?.id &&
            order.status === "pending_receipt"
        )
        .map((order) => order.id)
    );
  }, [branch?.id, transferHistory]);

  const handleTabChange = useCallback(
    (tab) => {
      clearFeedback();
      setActiveTab(tab);
    },
    [clearFeedback]
  );

  const handleCancelTransfer = useCallback(
    async (transferOrderId) => {
      clearFeedback();
      setSubmitting(true);

      try {
        const cancelledTransfer = await cancelTransferOrder({
          transferOrderId,
          currentBranch: branch,
          user,
        });

        await refreshProducts();
        await reloadOrders();
        setSuccess(
          `Se canceló ${cancelledTransfer.folio} y las piezas regresaron a ${cancelledTransfer.originBranchName}.`
        );
      } catch (cancelError) {
        console.error("No se pudo cancelar el traspaso:", cancelError);
        setError(
          cancelError?.message ||
            "No se pudo cancelar la orden de traspaso."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [branch, clearFeedback, refreshProducts, reloadOrders, setError, setSuccess]
  );

  return {
    activeTab,
    setActiveTab,
    branchOptions,
    destinationOptions,
    loadingBranches,
    pendingReceiptOrders,
    pendingReceiptsCount,
    transferHistory,
    transferMetrics,
    cancellableTransferIds,
    submitting,
    setSubmitting,
    handleTabChange,
    handleCancelTransfer,
    reloadOrders,
    reloadProductsSilently,
  };
};

export default useTransferDataLoad;
