/**
 * Genera el texto del ticket y confirma su disponibilidad para impresion.
 *
 * LIMITACION CONOCIDA (KNOWN_ISSUES.md #59): esta funcion todavia no imprime.
 * `electron/preload.js` no expone ningun canal de impresion y en la base (`0c51210`)
 * este modulo solo escribia el texto en consola. Por eso no puede fallar y su
 * contrato se reduce a `{ success: true, message }`: la rama de fallo se elimino
 * junto con los `console.log` de #57 porque era inalcanzable.
 *
 * En consecuencia, el manejo de error de los tres llamadores (`CashCut.jsx`,
 * `salesTicketService.js` y `useSalesHistory.js`) es hoy codigo muerto. Ninguno
 * lee la propiedad `error`; los tres se limitan a ramificar sobre `success`.
 *
 * Al implementar la impresion real hay que devolver `{ success: false, message, error }`
 * en el fallo para que esos tres bloques vuelvan a ser alcanzables.
 */
export const printTicket = async (_ticketText) => {
  return {
    success: true,
    message: "Ticket generado correctamente",
  };
};
