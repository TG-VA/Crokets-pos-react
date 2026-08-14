import { useState } from "react";

export const useSalesPendingTicketsState = () => {
  const [ticketNumber, setTicketNumber] = useState(1);
  const [pendingTickets, setPendingTickets] = useState([]);

  return {
    ticketNumber, setTicketNumber,
    pendingTickets, setPendingTickets,
  };
};