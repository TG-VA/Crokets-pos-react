export const printTicket = async (ticketText) => {
  try {
    console.log("========== TICKET A IMPRIMIR ==========");
    console.log(ticketText);
    console.log("=======================================");

    return {
      success: true,
      message: "Ticket generado correctamente",
    };
  } catch (error) {
    console.error("Error al imprimir ticket:", error);
    return {
      success: false,
      message: "No se pudo imprimir el ticket",
      error,
    };
  }
};