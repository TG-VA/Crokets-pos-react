/**
 * ticketFooterFormatters.js
 * Resolucion del pie del ticket a partir de la plantilla comercial.
 *
 * Concentra los textos por defecto y la regla de vacio del pie para que el
 * ticket real, el simulador en vivo y el ticket de prueba impriman
 * exactamente lo mismo ante la misma plantilla. No depende de la base de
 * datos: es una pura translation de la plantilla a la carga util del pie.
 */

export const TICKET_FOOTER_DEFAULTS = Object.freeze({
  line1: "Gracias por su compra",
  line2: "Agenda tu cita de baño",
  phone: "998 117 5387",
  returnPolicy: "Para cambios o devoluciones presentar ticket de compra",
});

/**
 * Traduce la plantilla comercial al pie del ticket.
 *
 * Un campo ausente toma el texto por defecto y un campo vacio se omite del
 * pie: vaciar un campo en la configuracion es la forma de quitar esa linea
 * del ticket, y la vista previa no puede divergir de lo que se imprime.
 */
export const buildTicketFooter = (customization = null) => ({
  line1: customization?.footerLine1 ?? TICKET_FOOTER_DEFAULTS.line1,
  line2: customization?.footerLine2 ?? TICKET_FOOTER_DEFAULTS.line2,
  phone: customization?.footerPhone ?? TICKET_FOOTER_DEFAULTS.phone,
  returnPolicy:
    customization?.returnPolicy ?? TICKET_FOOTER_DEFAULTS.returnPolicy,
});
