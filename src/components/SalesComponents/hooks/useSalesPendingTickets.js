import { useCallback } from "react";
import { getSyncedRewardsFromCart } from "../utils/salesRewardUtils";

const useSalesPendingTickets = ({
  productos = [],
  productosRef,
  pendingTickets = [],
  setPendingTickets,
  ticketNumber = 1,
  setTicketNumber,
  currentSaleClient = null,
  setCurrentSaleClient,
  currentSaleReward = null,
  setCurrentSaleReward,
  subtotal = 0,
  discountTotal = 0,
  total = 0,
  setProductos,
  setSelectedProduct,
  setPendingFreeProductRewards,
  setPendingProductDiscountRewards,
  setActiveProductDiscountReward,
  setRewardProductModalOpen,
  setProductDiscountRewardModalOpen,
  setBarcode,
  setSaleToken,
  setChangeModalOpen,
  setDeleteModalOpen,
  showAppWarning,
}) => {
  const resetPendingRewardState = useCallback(() => {
    setPendingFreeProductRewards([]);
    setPendingProductDiscountRewards([]);
    setActiveProductDiscountReward(null);
    setRewardProductModalOpen(false);
    setProductDiscountRewardModalOpen(false);
  }, [
    setPendingFreeProductRewards,
    setPendingProductDiscountRewards,
    setActiveProductDiscountReward,
    setRewardProductModalOpen,
    setProductDiscountRewardModalOpen,
  ]);

  const handleSavePendingTicket = useCallback((ticketName) => {
    const pendingTicket = {
      number: ticketNumber,
      name: ticketName,
      products: productos,
      client: currentSaleClient,
      reward: currentSaleReward,
      subtotal,
      discountTotal,
      total,
      date: new Date().toISOString(),
    };

    // Usar functional state update para mayor seguridad
    setPendingTickets((prev) => [...prev, pendingTicket]);

    setProductos([]);
    if (productosRef) productosRef.current = [];

    setCurrentSaleClient(null);
    setCurrentSaleReward(null);
    resetPendingRewardState();
    setSelectedProduct(null);
    setTicketNumber((prev) => prev + 1);
    setBarcode("");
    setSaleToken(null);
  }, [
    ticketNumber, productos, productosRef, currentSaleClient, currentSaleReward,
    subtotal, discountTotal, total, setPendingTickets, setProductos,
    setCurrentSaleClient, setCurrentSaleReward, resetPendingRewardState,
    setSelectedProduct, setTicketNumber, setBarcode, setSaleToken,
  ]);

  const handleChangeToTicket = useCallback((ticket) => {
    if (!ticket) return;

    if (productos.length > 0) {
      const currentTicket = {
        number: ticketNumber,
        name: `Ticket ${ticketNumber}`,
        products: productos,
        client: currentSaleClient,
        reward: currentSaleReward,
        subtotal,
        discountTotal,
        total,
        date: new Date().toISOString(),
      };

      setPendingTickets((prev) => [...prev.filter((t) => t !== ticket), currentTicket]);
    } else {
      setPendingTickets((prev) => prev.filter((t) => t !== ticket));
    }

    const restoredProducts = Array.isArray(ticket.products) ? ticket.products : [];
    
    setProductos(restoredProducts);
    if (productosRef) productosRef.current = restoredProducts;

    setCurrentSaleClient(ticket.client || null);
    setCurrentSaleReward(getSyncedRewardsFromCart(restoredProducts, ticket.reward || null));
    resetPendingRewardState();
    setTicketNumber(Number(ticket.number || ticketNumber));
    setSelectedProduct(null);
    setBarcode("");
    setSaleToken(null);
  }, [
    productos, productosRef, ticketNumber, currentSaleClient, currentSaleReward,
    subtotal, discountTotal, total, setPendingTickets, setProductos,
    setCurrentSaleClient, setCurrentSaleReward, resetPendingRewardState,
    setTicketNumber, setSelectedProduct, setBarcode, setSaleToken,
  ]);

  const handleDeleteTicket = useCallback((index) => {
    setPendingTickets((prev) => prev.filter((_, ticketIndex) => ticketIndex !== index));
  }, [setPendingTickets]);

  const handleOpenChangeModal = useCallback(() => {
    if (!Array.isArray(pendingTickets) || pendingTickets.length === 0) {
      showAppWarning("No hay tickets pendientes");
      return;
    }
    setChangeModalOpen(true);
  }, [pendingTickets, setChangeModalOpen, showAppWarning]);

  const handleOpenDeleteModal = useCallback(() => {
    if (!Array.isArray(pendingTickets) || pendingTickets.length === 0) {
      showAppWarning("No hay tickets pendientes por eliminar");
      return;
    }
    setDeleteModalOpen(true);
  }, [pendingTickets, setDeleteModalOpen, showAppWarning]);

  return {
    handleSavePendingTicket,
    handleChangeToTicket,
    handleDeleteTicket,
    handleOpenChangeModal,
    handleOpenDeleteModal,
  };
};

export default useSalesPendingTickets;