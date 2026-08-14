import { useCallback } from "react";
import { getSyncedRewardsFromCart } from "../utils/salesRewardUtils";

const useSalesPendingTickets = ({
  pendingTickets = [],
  setPendingTickets,
  ticketNumber = 1,
  setTicketNumber,
  // Agrupamos la info de la venta actual en un solo objeto
  currentSaleData, 
  // Callbacks de orquestación (Inversión de Control)
  onClearSale, 
  onLoadSale,
  // UI
  setChangeModalOpen,
  setDeleteModalOpen,
  showAppWarning,
}) => {

  const handleSavePendingTicket = useCallback((ticketName) => {
    const { productos, currentSaleClient, currentSaleReward, subtotal, discountTotal, total } = currentSaleData;

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

    // 1. Guardamos el ticket
    setPendingTickets((prev) => [...prev, pendingTicket]);
    setTicketNumber((prev) => prev + 1);

    // 2. Le decimos al orquestador que limpie la UI (Él sabe cómo hacerlo)
    onClearSale();
  }, [currentSaleData, ticketNumber, setPendingTickets, setTicketNumber, onClearSale]);


  const handleChangeToTicket = useCallback((ticket) => {
    if (!ticket) return;

    const { productos, currentSaleClient, currentSaleReward, subtotal, discountTotal, total } = currentSaleData;

    // Si hay algo en el carrito actual, lo guardamos antes de cambiar
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

    // Preparamos los datos desempaquetados
    const restoredProducts = Array.isArray(ticket.products) ? ticket.products : [];
    const restoredReward = getSyncedRewardsFromCart(restoredProducts, ticket.reward || null);
    
    setTicketNumber(Number(ticket.number || ticketNumber));

    // Le pasamos los datos al orquestador para que los monte en la UI
    onLoadSale({
      productos: restoredProducts,
      client: ticket.client || null,
      reward: restoredReward
    });

  }, [currentSaleData, ticketNumber, setPendingTickets, setTicketNumber, onLoadSale]);


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