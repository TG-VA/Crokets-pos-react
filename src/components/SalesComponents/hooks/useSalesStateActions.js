import { useCallback } from "react";

const useSalesStateActions = ({
  productos,
  setProductos,
  productosRef,
  setSelectedProduct,
  setCurrentSaleClient,
  setCurrentSaleReward,
  setTicketNumber,
  setSaleToken,
  setSaleNotes,
  setBarcode,
  setPendingTickets,
  setPendingFreeProductRewards,
  setRewardProductModalOpen,
  setPendingProductDiscountRewards,
  setActiveProductDiscountReward,
  setProductDiscountRewardModalOpen,
  setStockWarningMsg,
  showAppModal,
  closeAppModal,
}) => {
  // --- CÁLCULO DE TOTALES ---
  const subtotal = productos.reduce(
    (sum, producto) =>
      sum +
      Number(producto.precioOriginal ?? producto.precio ?? 0) *
        Number(producto.cantidad || 0),
    0
  );

  const discountTotal = productos.reduce(
    (sum, producto) => sum + Number(producto.descuentoMonto || 0),
    0
  );

  const total = subtotal - discountTotal;

  // --- ACCIONES DE ESTADO DE LA VENTA ---
  const restoreSalesDraft = useCallback(
    (draft) => {
      const restoredProducts = Array.isArray(draft?.productos)
        ? draft.productos
        : [];

      setProductos(restoredProducts);
      if (productosRef) productosRef.current = restoredProducts;
      setSelectedProduct(null);
      setCurrentSaleClient(draft?.currentSaleClient || null);
      setCurrentSaleReward(draft?.currentSaleReward || null);
      setTicketNumber(Number(draft?.ticketNumber || 1));
      setSaleToken(draft?.saleToken || null);
      setSaleNotes(draft?.saleNotes || "");
      setBarcode(draft?.barcode || "");
      setPendingTickets(
        Array.isArray(draft?.pendingTickets) ? draft.pendingTickets : []
      );
    },
    [
      setProductos,
      productosRef,
      setSelectedProduct,
      setCurrentSaleClient,
      setCurrentSaleReward,
      setTicketNumber,
      setSaleToken,
      setSaleNotes,
      setBarcode,
      setPendingTickets,
    ]
  );

  const discardSalesDraftState = useCallback(() => {
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
  }, [
    setProductos,
    productosRef,
    setSelectedProduct,
    setCurrentSaleClient,
    setCurrentSaleReward,
    setPendingFreeProductRewards,
    setRewardProductModalOpen,
    setPendingProductDiscountRewards,
    setActiveProductDiscountReward,
    setProductDiscountRewardModalOpen,
    setBarcode,
    setSaleToken,
    setSaleNotes,
    setStockWarningMsg,
  ]);

  const openSalesDraftRecoveryModal = useCallback(
    ({ message, onConfirm, onCancel }) => {
      showAppModal({
        type: "warning",
        title: "Venta pendiente encontrada",
        message,
        confirmText: "Recuperar venta",
        cancelText: "Descartar",
        showCancel: true,
        onConfirm: () => {
          closeAppModal();
          if (typeof onConfirm === "function") {
            onConfirm();
          }
        },
        onCancel: () => {
          closeAppModal();
          if (typeof onCancel === "function") {
            onCancel();
          }
        },
      });
    },
    [showAppModal, closeAppModal]
  );

  const resetCurrentSale = useCallback(() => {
    setProductos([]);
    setSelectedProduct(null);
    setCurrentSaleClient(null);
    setCurrentSaleReward(null);
    setPendingFreeProductRewards([]);
    setRewardProductModalOpen(false);
    setPendingProductDiscountRewards([]);
    setActiveProductDiscountReward(null);
    setProductDiscountRewardModalOpen(false);
    setTicketNumber((prev) => prev + 1);
    setBarcode("");
    setSaleToken(null);
    setSaleNotes("");
    setStockWarningMsg("");
  }, [
    setProductos,
    setSelectedProduct,
    setCurrentSaleClient,
    setCurrentSaleReward,
    setPendingFreeProductRewards,
    setRewardProductModalOpen,
    setPendingProductDiscountRewards,
    setActiveProductDiscountReward,
    setProductDiscountRewardModalOpen,
    setTicketNumber,
    setBarcode,
    setSaleToken,
    setSaleNotes,
    setStockWarningMsg,
  ]);

  return {
    subtotal,
    discountTotal,
    total,
    restoreSalesDraft,
    discardSalesDraftState,
    openSalesDraftRecoveryModal,
    resetCurrentSale,
  };
};

export default useSalesStateActions;