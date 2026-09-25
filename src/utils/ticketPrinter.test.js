import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { printTicket } from "./ticketPrinter";

describe("printTicket", () => {
  let logSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve el contrato de exito", async () => {
    const result = await printTicket("TICKET DE PRUEBA");

    expect(result).toEqual({
      success: true,
      message: "Ticket generado correctamente",
    });
  });

  it("procesa el texto recibido sin emitir logs de depuracion", async () => {
    const result = await printTicket("LINEA 1\nLINEA 2");

    expect(result).toMatchObject({ success: true });
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("acepta texto vacio o indefinido sin romper", async () => {
    await expect(printTicket()).resolves.toMatchObject({ success: true });
    await expect(printTicket("")).resolves.toMatchObject({ success: true });
  });
});
