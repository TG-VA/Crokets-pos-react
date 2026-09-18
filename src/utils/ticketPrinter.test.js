import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { printTicket } from "./ticketPrinter";

describe("printTicket", () => {
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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

  it("imprime el texto recibido", async () => {
    await printTicket("LINEA 1\nLINEA 2");

    expect(logSpy).toHaveBeenCalledWith("LINEA 1\nLINEA 2");
  });

  it("reporta fallo y conserva el error cuando la impresion lanza", async () => {
    const failure = new Error("impresora desconectada");
    logSpy.mockImplementation(() => {
      throw failure;
    });

    const result = await printTicket("TICKET DE PRUEBA");

    expect(result.success).toBe(false);
    expect(result.message).toBe("No se pudo imprimir el ticket");
    expect(result.error).toBe(failure);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("acepta texto vacio o indefinido sin romper", async () => {
    await expect(printTicket()).resolves.toMatchObject({ success: true });
    await expect(printTicket("")).resolves.toMatchObject({ success: true });
  });
});
