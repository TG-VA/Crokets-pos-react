import { useCallback, useMemo, useState } from "react";

import { useAuth } from "../../../../../contexts/AuthContext";
import { receiveStoreOrder } from "../services/ordersService";
import {
  calculateDifference,
  getMissingReceiptItems,
  getPendingOrders,
  isReceiptComplete,
} from "../utils/ordersCalculationService";

const sanitizeQuantity = (value) => {
  const raw = String(value ?? "").replace(/[^\d.]/g, "");

  if (!raw) return "";

  const [integerPart, ...rest] = raw.split(".");

  if (rest.length === 0) return integerPart;

  return `${integerPart}.${rest.join("")}`;
};

export const useReceiveOrderForm = ({
  orders = [],
  currentBranchId,
  onReceived,
}) => {
  const { user } = useAuth();

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [quantities, setQuantities] = useState({});
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

  const isComplete = useMemo(
    () =>
      selectedOrder
        ? isReceiptComplete(selectedOrder.items, quantities)
        : false,
    [quantities, selectedOrder]
  );

  const selectOrder = useCallback((order) => {
    setSelectedOrderId(order?.id || "");
    setQuantities({});
    setError("");
  }, []);

  const setQuantity = useCallback((productId, value) => {
    const sanitized = sanitizeQuantity(value);

    setQuantities((previous) => ({
      ...previous,
      [productId]: sanitized,
    }));
    setError("");
  }, []);

  const getDifferencePreview = useCallback(
    (item) => calculateDifference(item.expectedQty, quantities[item.productId]),
    [quantities]
  );

  const resetSelection = useCallback(() => {
    setSelectedOrderId("");
    setQuantities({});
    setError("");
  }, []);

  const submitReceipt = useCallback(async () => {
    if (isSubmitting || !selectedOrder) return null;

    if (!isComplete) {
      setError(
        `Captura el conteo fisico de todos los productos (${missingItems.length} pendiente(s)).`
      );
      return null;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const receivedOrder = await receiveStoreOrder({
        order: selectedOrder,
        currentBranchId,
        quantities,
        user,
      });

      onReceived?.(receivedOrder);
      resetSelection();

      return receivedOrder;
    } catch (err) {
      setError(err?.message || "No se pudo registrar la recepcion.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentBranchId,
    isComplete,
    isSubmitting,
    missingItems.length,
    onReceived,
    quantities,
    resetSelection,
    selectedOrder,
    user,
  ]);

  return {
    pendingOrders,
    selectedOrder,
    selectedOrderId,
    quantities,
    isComplete,
    missingItems,
    error,
    isSubmitting,
    canSubmit: Boolean(selectedOrder) && isComplete && !isSubmitting,
    selectOrder,
    setQuantity,
    getDifferencePreview,
    resetSelection,
    submitReceipt,
  };
};
