import { useCallback } from "react";

const useSalesStateActions = ({
  setProductos, productosRef, setSelectedProduct, setCurrentSaleClient,
  setCurrentSaleReward, setTicketNumber, setSaleToken, setSaleNotes, setBarcode,
  setPendingTickets, setPendingFreeProductRewards, setRewardProductModalOpen,
  setPendingProductDiscountRewards, setActiveProductDiscountReward,
  setProductDiscountRewardModalOpen, setStockWarningMsg, showAppModal, closeAppModal,
}) => {
  
  // 1. Restaurar un estado previo
  const restoreSalesDraft = useCallback((draft) => {
    const restoredProducts = Array.isArray(draft?.productos) ? draft.productos : [];
    
    setProductos(restoredProducts);
    if (productosRef) productosRef.current = restoredProducts;
    
    setSelectedProduct(null);
    setCurrentSaleClient(draft?.currentSaleClient || null);
    setCurrentSaleReward(draft?.currentSaleReward || null);
    setTicketNumber(Number(draft?.ticketNumber || 1));
    setSaleToken(draft?.saleToken || null);
    setSaleNotes(draft?.saleNotes || "");
    setBarcode(draft?.barcode || "");
    setPendingTickets(Array.isArray(draft?.pendingTickets) ? draft.pendingTickets : []);
  }, [
    setProductos, productosRef, setSelectedProduct, setCurrentSaleClient, setCurrentSaleReward,
    setTicketNumber, setSaleToken, setSaleNotes, setBarcode, setPendingTickets,
  ]);

  // 2. Lógica base unificada para limpiar la pantalla (DRY - Don't Repeat Yourself)
  const clearSalesWorkspace = useCallback(({ incrementTicket = false } = {}) => {
    setProductos([]);
    if (productosRef) productosRef.current = [];
    setSelectedProduct(null);
    setCurrentSaleClient(null);
    setCurrentSaleReward(null);
    setPendingFreeProductRewards([]);
    setRewardProductModalOpen(false);
    setPendingProductDiscountRewards([]);
    setActiveProductDiscountReward(null);
    setProductDiscountRewardModalOpen(false);
    setBarcode("");
    setSaleToken(null);
    setSaleNotes("");
    setStockWarningMsg("");

    if (incrementTicket) {
      setTicketNumber((prev) => prev + 1);
    }
  }, [
    setProductos, productosRef, setSelectedProduct, setCurrentSaleClient, setCurrentSaleReward,
    setPendingFreeProductRewards, setRewardProductModalOpen, setPendingProductDiscountRewards,
    setActiveProductDiscountReward, setProductDiscountRewardModalOpen, setBarcode, setSaleToken,
    setSaleNotes, setStockWarningMsg, setTicketNumber
  ]);

  // Alias para mantener compatibilidad con tu orquestador principal
  const discardSalesDraftState = useCallback(() => clearSalesWorkspace({ incrementTicket: false }), [clearSalesWorkspace]);
  const resetCurrentSale = useCallback(() => clearSalesWorkspace({ incrementTicket: true }), [clearSalesWorkspace]);

  // 3. Control de UI
  const openSalesDraftRecoveryModal = useCallback(({ message, onConfirm, onCancel }) => {
    showAppModal({
      type: "warning",
      title: "Venta pendiente encontrada",
      message,
      confirmText: "Recuperar venta",
      cancelText: "Descartar",
      showCancel: true,
      onConfirm: () => {
        closeAppModal();
        if (typeof onConfirm === "function") onConfirm();
      },
      onCancel: () => {
        closeAppModal();
        if (typeof onCancel === "function") onCancel();
      },
    });
  }, [showAppModal, closeAppModal]);

  return {
    restoreSalesDraft,
    discardSalesDraftState,
    openSalesDraftRecoveryModal,
    resetCurrentSale,
  };
};

export default useSalesStateActions;