import { useCallback, useEffect, useMemo, useState } from "react";

import { receiveTransferOrder } from "../services/transfersService";

const useReceiveForm = ({
  branch,
  user,
  refreshProducts,
  reloadOrders,
  setActiveTab,
  pendingReceiptOrders,
  submitting,
  setSubmitting,
  clearFeedback,
  setError,
  setSuccess,
}) => {
  const [selectedReceiptOrderId, setSelectedReceiptOrderId] = useState("");
  const [receiptQuantities, setReceiptQuantities] = useState({});

  useEffect(() => {
    if (pendingReceiptOrders.length === 0) {
      setSelectedReceiptOrderId("");
      return;
    }

    const stillExists = pendingReceiptOrders.some(
      (order) => order.id === selectedReceiptOrderId
    );

    if (stillExists) {
      return;
    }

    setSelectedReceiptOrderId(pendingReceiptOrders[0]?.id || "");
  }, [pendingReceiptOrders, selectedReceiptOrderId]);

  const selectedReceiptOrder = useMemo(() => {
    return (
      pendingReceiptOrders.find(
        (order) => order.id === selectedReceiptOrderId
      ) || null
    );
  }, [pendingReceiptOrders, selectedReceiptOrderId]);

  useEffect(() => {
    if (!selectedReceiptOrder) {
      setReceiptQuantities({});
      return;
    }

    const nextReceiptQuantities = selectedReceiptOrder.items.reduce(
      (accumulator, item) => {
        accumulator[item.productId] = Number(item.requestedQty ?? 0) || 0;
        return accumulator;
      },
      {}
    );

    setReceiptQuantities(nextReceiptQuantities);
  }, [selectedReceiptOrder]);

  const handleSelectReceiptOrder = useCallback(
    (orderId) => {
      clearFeedback();
      setSelectedReceiptOrderId(orderId);
    },
    [clearFeedback]
  );

  const handleReceiptQuantityChange = useCallback(
    (productId, value) => {
      clearFeedback();

      setReceiptQuantities((currentValues) => ({
        ...currentValues,
        [productId]: value,
      }));
    },
    [clearFeedback]
  );

  const handleConfirmReceipt = useCallback(async () => {
    if (!selectedReceiptOrder) {
      setError("Selecciona una orden pendiente para recibir.");
      return;
    }

    clearFeedback();
    setSubmitting(true);

    try {
      const completedTransfer = await receiveTransferOrder({
        transferOrderId: selectedReceiptOrder.id,
        receivedQuantities: receiptQuantities,
        currentBranch: branch,
        user,
      });

      await refreshProducts();
      await reloadOrders();
      setSuccess(
        completedTransfer.status === "received_with_difference"
          ? `Se recibió ${completedTransfer.folio} con diferencias y el faltante regresó automáticamente a ${completedTransfer.originBranchName}.`
          : `Se recibió completo el traspaso ${completedTransfer.folio}.`
      );
      setActiveTab("history");
    } catch (receiveError) {
      console.error("No se pudo recibir el traspaso:", receiveError);
      setError(
        receiveError?.message ||
          "No se pudo registrar la recepción del traspaso."
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    branch,
    clearFeedback,
    receiptQuantities,
    refreshProducts,
    reloadOrders,
    selectedReceiptOrder,
    setActiveTab,
    setError,
    setSubmitting,
    setSuccess,
    user,
  ]);

  return {
    selectedReceiptOrderId,
    selectedReceiptOrder,
    receiptQuantities,
    handleSelectReceiptOrder,
    handleReceiptQuantityChange,
    handleConfirmReceipt,
  };
};

export default useReceiveForm;
