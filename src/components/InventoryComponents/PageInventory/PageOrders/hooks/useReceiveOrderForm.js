import { useCallback, useMemo, useState } from "react";

import { useAuth } from "../../../../../contexts/AuthContext";
import { receiveStoreOrder } from "../services/ordersService";
import {
  calculateDifference,
  getInitialReceiptCosts,
  buildMissingReceiptCostError,
  getMissingReceiptCostItems,
  getMissingReceiptItems,
  getPendingOrders,
  isReceiptComplete,
} from "../utils/ordersCalculationService";
import {
  hasReceiptDifferences,
  validateReceiptNote,
} from "../utils/receiptNoteCalculationService";
import {
  sanitizeCostInput,
  sanitizeIntegerQuantity,
} from "../utils/ordersQuantityInput";

export const useReceiveOrderForm = ({
  orders = [],
  currentBranchId,
  onReceived,
}) => {
  const { user } = useAuth();

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [quantities, setQuantities] = useState({});
  const [costs, setCosts] = useState({});
  const [receiptNote, setReceiptNoteState] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingOrders = useMemo(
    () => getPendingOrders({ orders, currentBranchId }),
    [currentBranchId, orders]
  );

  const selectedOrder = useMemo(
    () => pendingOrders.find((order) => order.id === selectedOrderId) || null,
    [pendingOrders, selectedOrderId]
  );

  const missingItems = useMemo(
    () =>
      selectedOrder
        ? getMissingReceiptItems(selectedOrder.items, quantities)
        : [],
    [quantities, selectedOrder]
  );

  const missingCostItems = useMemo(
    () =>
      selectedOrder
        ? getMissingReceiptCostItems(selectedOrder.items, quantities, costs)
        : [],
    [costs, quantities, selectedOrder]
  );

  const isComplete = useMemo(
    () =>
      selectedOrder
        ? isReceiptComplete(selectedOrder.items, quantities)
        : false,
    [quantities, selectedOrder]
  );

  const isNoteRequired = useMemo(
    () =>
      selectedOrder
        ? hasReceiptDifferences(selectedOrder.items, quantities)
        : false,
    [quantities, selectedOrder]
  );

  const noteError = useMemo(
    () =>
      selectedOrder
        ? validateReceiptNote({
            items: selectedOrder.items,
            quantities,
            note: receiptNote,
          })
        : "",
    [quantities, receiptNote, selectedOrder]
  );

  const selectOrder = useCallback((order) => {
    setSelectedOrderId(order?.id || "");
    setQuantities({});
    setCosts(getInitialReceiptCosts(order?.items));
    setReceiptNoteState("");
    setError("");
  }, []);

  const setQuantity = useCallback((productId, value) => {
    const sanitized = sanitizeIntegerQuantity(value);

    setQuantities((previous) => ({
      ...previous,
      [productId]: sanitized,
    }));
    setError("");
  }, []);

  const setCost = useCallback((productId, value) => {
    const sanitized = sanitizeCostInput(value);

    if (sanitized === null) return;

    setCosts((previous) => ({
      ...previous,
      [productId]: sanitized,
    }));
    setError("");
  }, []);

  const setReceiptNote = useCallback((value) => {
    setReceiptNoteState(value);
    setError("");
  }, []);

  const getDifferencePreview = useCallback(
    (item) => calculateDifference(item.expectedQty, quantities[item.productId]),
    [quantities]
  );

  const resetSelection = useCallback(() => {
    setSelectedOrderId("");
    setQuantities({});
    setCosts({});
    setReceiptNoteState("");
    setError("");
  }, []);

  const submitReceipt = useCallback(async () => {
    if (isSubmitting || !selectedOrder) return null;

    if (!isComplete) {
      setError(
        `Captura el conteo físico de todos los productos (${missingItems.length} pendiente(s)).`
      );
      return null;
    }

    if (missingCostItems.length > 0) {
      setError(buildMissingReceiptCostError(missingCostItems.length));
      return null;
    }

    if (noteError) {
      setError(noteError);
      return null;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const receivedOrder = await receiveStoreOrder({
        order: selectedOrder,
        currentBranchId,
        quantities,
        costs,
        receiptNote,
        user,
      });

      onReceived?.(receivedOrder);
      resetSelection();

      return receivedOrder;
    } catch (err) {
      setError(err?.message || "No se pudo registrar la recepción.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    costs,
    currentBranchId,
    isComplete,
    isSubmitting,
    missingCostItems.length,
    missingItems.length,
    noteError,
    onReceived,
    quantities,
    receiptNote,
    resetSelection,
    selectedOrder,
    user,
  ]);

  return {
    pendingOrders,
    selectedOrder,
    selectedOrderId,
    quantities,
    costs,
    receiptNote,
    isNoteRequired,
    noteError,
    isComplete,
    missingItems,
    missingCostItems,
    error,
    isSubmitting,
    canSubmit:
      Boolean(selectedOrder) &&
      isComplete &&
      missingCostItems.length === 0 &&
      !isSubmitting &&
      !noteError,
    selectOrder,
    setQuantity,
    setCost,
    setReceiptNote,
    getDifferencePreview,
    resetSelection,
    submitReceipt,
  };
};
