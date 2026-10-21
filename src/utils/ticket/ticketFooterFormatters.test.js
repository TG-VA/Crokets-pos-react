import { describe, it, expect } from "vitest";

import {
  buildTicketFooter,
  TICKET_FOOTER_DEFAULTS,
} from "./ticketFooterFormatters";
import { buildFooterSection } from "./ticketSections";

describe("ticketFooterFormatters", () => {
  it("traduce la plantilla comercial al pie del ticket", () => {
    const footer = buildTicketFooter({
      footerLine1: "Gracias por todo",
      footerLine2: "Agenda tu cita",
      footerPhone: "998 117 5387",
      returnPolicy: "Solo con ticket",
    });

    expect(footer).toEqual({
      line1: "Gracias por todo",
      line2: "Agenda tu cita",
      phone: "998 117 5387",
      returnPolicy: "Solo con ticket",
    });
  });

  it("completa con los valores por defecto los campos ausentes", () => {
    expect(buildTicketFooter({})).toEqual(TICKET_FOOTER_DEFAULTS);
    expect(buildTicketFooter(null)).toEqual(TICKET_FOOTER_DEFAULTS);
    expect(buildTicketFooter(undefined)).toEqual(TICKET_FOOTER_DEFAULTS);
  });

  it("sustituye por el valor por defecto los campos que quedan vacios", () => {
    const footer = buildTicketFooter({
      footerLine1: "",
      footerLine2: "",
      footerPhone: "",
      returnPolicy: "",
    });

    expect(footer).toEqual(TICKET_FOOTER_DEFAULTS);
  });

  it("el pie impreso usa exactamente los valores resueltos por la plantilla", () => {
    const footer = buildTicketFooter({
      footerLine1: "Gracias por todo",
      footerPhone: "998 117 5387",
    });
    const lines = buildFooterSection(footer);

    expect(lines).toContain("Gracias por todo");
    expect(lines).toContain("Tel. 998 117 5387");
  });

  it("expone los valores por defecto como constantes inmutables", () => {
    expect(Object.isFrozen(TICKET_FOOTER_DEFAULTS)).toBe(true);
  });
});
