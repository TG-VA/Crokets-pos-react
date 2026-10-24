import { useCallback, useMemo, useState } from "react";

import { useAuth } from "../../../../../contexts/AuthContext";
import { useBranch } from "../../../../../contexts/BranchContext";
import { useProducts } from "../../../../../contexts/ProductsContext";
import { checkUserIsAdmin } from "../../../../../lib/permissionsService";
import { printStoreOrder } from "../services/ordersExportPdfService";
import {
  getPendingOrders,
  getOrderTotals,
} from "../utils/ordersCalculationService";
import { useCreateOrderForm } from "./useCreateOrderForm";
import { useOrdersData } from "./useOrdersData";
import { useReceiveOrderForm } from "./useReceiveOrderForm";

export const useOrdersPage = () => {
  const { user } = useAuth();
  const { branch } = useBranch();
  const { products } = useProducts();

  const {
    orders,
    branches,
    isLoading,
    error,
    currentBranchId,
    refreshData,
    syncAfterMutation,
    upsertOrder,
  } = useOrdersData();

  const [activeTab, setActiveTab] = useState("receive");
  const [feedback, setFeedback] = useState(null);
  const [createAccessGranted, setCreateAccessGranted] = useState(false);
  const [adminAuthOpen, setAdminAuthOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);

  const pendingOrders = useMemo(
    () => getPendingOrders({ orders, currentBranchId }),
    [currentBranchId, orders]
  );

  const summary = useMemo(() => {
    const pendingTotals = getOrderTotals(
      pendingOrders.flatMap((order) => order.items)
    );

    return {
      pendingOrders: pendingOrders.length,
      pendingUnits: pendingTotals.expected,
      withDifference: orders.filter(
        (order) => order.status === "accepted_with_difference"
      ).length,
      totalOrders: orders.length,
    };
  }, [orders, pendingOrders]);

  const handleReceived = useCallback(
    async (receivedOrder) => {
      if (!receivedOrder) return;

      upsertOrder(receivedOrder);
      await syncAfterMutation();

      const hasDifference = receivedOrder.status === "accepted_with_difference";

      setFeedback({
        tone: hasDifference ? "warning" : "success",
        message: hasDifference
          ? `Pedido ${receivedOrder.orderNumber} recibido con diferencias. ${receivedOrder.discrepancyNotes}`
          : `Pedido ${receivedOrder.orderNumber} recibido correctamente. El inventario ya fue actualizado.`,
      });
    },
    [syncAfterMutation, upsertOrder]
  );

  const receiveForm = useReceiveOrderForm({
    orders,
    currentBranchId,
    onReceived: handleReceived,
  });

  const createForm = useCreateOrderForm({
    currentBranch: branch,
    branches,
    products,
  });

  const handleCreate = useCallback(async () => {
    const createdOrder = await createForm.saveOrder();

    if (!createdOrder) return null;

    upsertOrder(createdOrder);
    await syncAfterMutation();
    setFeedback({
      tone: "success",
      message: `Pedido ${createdOrder.orderNumber} enviado a ${createdOrder.toBranchName}.`,
    });

    return createdOrder;
  }, [createForm, syncAfterMutation, upsertOrder]);

  const handleTabSelect = useCallback(
    async (tabId, event) => {
      event?.preventDefault();

      if (tabId !== "create") {
        setActiveTab(tabId);
        return;
      }

      if (createAccessGranted) {
        setActiveTab("create");
        return;
      }

      const isAdmin = await checkUserIsAdmin(user?.id);

      if (isAdmin) {
        setCreateAccessGranted(true);
        setActiveTab("create");
        return;
      }

      setAdminAuthOpen(true);
    },
    [createAccessGranted, user?.id]
  );

  const handleAdminAuthorized = useCallback(() => {
    setAdminAuthOpen(false);
    setCreateAccessGranted(true);
    setActiveTab("create");
  }, []);

  const handlePrint = useCallback((order, preOpenedWindow = null) => {
    const opened = printStoreOrder(order, preOpenedWindow);

    if (!opened) {
      setFeedback({
        tone: "error",
        message:
          "No se pudo abrir la vista de impresión. Revisa el bloqueador de ventanas emergentes de tu navegador.",
      });
      return false;
    }

    return true;
  }, []);

  return {
    activeTab,
    setActiveTab,
    handleTabSelect,
    feedback,
    setFeedback,
    dismissFeedback: () => setFeedback(null),
    isLoading,
    error,
    orders,
    branches,
    products,
    currentBranchId,
    currentBranch: branch,
    reloadData: refreshData,
    summary,
    pendingOrders,
    receiveForm,
    createForm,
    createAccessGranted,
    handleCreate,
    adminAuthOpen,
    closeAdminAuth: () => setAdminAuthOpen(false),
    handleAdminAuthorized,
    detailOrder,
    openDetail: (order) => setDetailOrder(order),
    closeDetail: () => setDetailOrder(null),
    printOrder,
    openPrint: (order) => setPrintOrder(order),
    closePrint: () => setPrintOrder(null),
    handlePrint,
  };
};
