import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

import { printTicket } from "./ticketPrinter";

const installElectronBridge = (invoke) => {
  window.electronAPI = { invoke: vi.fn(invoke) };
  return window.electronAPI;
};

const removeElectronBridge = () => {
  delete window.electronAPI;
};

describe("printTicket", () => {
  beforeEach(() => {
    removeElectronBridge();
  });

  afterEach(() => {
    removeElectronBridge();
    vi.restoreAllMocks();
  });

  describe("dentro de Electron", () => {
    it("invoca el canal print-ticket con el texto y las opciones", async () => {
      const electronAPI = installElectronBridge(() =>
        Promise.resolve({
          success: true,
          message: "Ticket impreso correctamente.",
        })
      );

      await expect(printTicket("TICKET DE PRUEBA")).resolves.toEqual({
        success: true,
        simulated: false,
        message: "Ticket impreso correctamente.",
      });
      expect(electronAPI.invoke).toHaveBeenCalledWith("print-ticket", {
        ticketText: "TICKET DE PRUEBA",
        options: {},
      });
    });

    it("reenvia las opciones de perfil, impresora y copias", async () => {
      const electronAPI = installElectronBridge(() =>
        Promise.resolve({ success: true })
      );

      await printTicket("TICKET", {
        profile: "80mm",
        deviceName: "Termica",
        copies: 2,
      });

      expect(electronAPI.invoke).toHaveBeenCalledWith("print-ticket", {
        ticketText: "TICKET",
        options: { profile: "80mm", deviceName: "Termica", copies: 2 },
      });
    });

    it("devuelve el motivo del proceso principal cuando la impresion falla", async () => {
      installElectronBridge(() =>
        Promise.resolve({
          success: false,
          message: "No hay ninguna impresora configurada en el sistema.",
          error: "NO_PRINTER_AVAILABLE",
        })
      );

      await expect(printTicket("TICKET")).resolves.toEqual({
        success: false,
        simulated: false,
        message: "No hay ninguna impresora configurada en el sistema.",
        error: "NO_PRINTER_AVAILABLE",
      });
    });

    it("rellena mensaje y motivo cuando el proceso principal devuelve un contrato incompleto", async () => {
      installElectronBridge(() => Promise.resolve({ success: false }));

      await expect(printTicket("TICKET")).resolves.toEqual({
        success: false,
        simulated: false,
        message: "No se pudo imprimir el ticket.",
        error: "UNKNOWN_PRINT_ERROR",
      });
    });

    it("no propaga la excepcion del canal y la traduce al contrato", async () => {
      installElectronBridge(() => {
        throw new Error("Error al invocar el método 'invoke'");
      });

      await expect(printTicket("TICKET")).resolves.toEqual({
        success: false,
        simulated: false,
        message: "No se pudo imprimir el ticket.",
        error: "Error al invocar el método 'invoke'",
      });
    });

    it("no propaga un rechazo del canal y usa UNKNOWN_PRINT_ERROR sin motivo", async () => {
      installElectronBridge(() => Promise.reject({}));

      await expect(printTicket("TICKET")).resolves.toEqual({
        success: false,
        simulated: false,
        message: "No se pudo imprimir el ticket.",
        error: "UNKNOWN_PRINT_ERROR",
      });
    });

    it("reporta como fallo un resultado sin forma de contrato", async () => {
      installElectronBridge(() => Promise.resolve(undefined));

      await expect(printTicket("TICKET")).resolves.toMatchObject({
        success: false,
        error: "UNKNOWN_PRINT_ERROR",
      });
    });
  });

  describe("fuera de Electron", () => {
    it("marca la impresion como simulada cuando no hay puente de contexto", async () => {
      const result = await printTicket("TICKET DE PRUEBA");

      expect(result).toEqual({
        success: true,
        simulated: true,
        message:
          "Ticket generado correctamente. La impresion no esta disponible fuera de Electron.",
      });
    });

    it("no invoca nada y no falla con texto vacio o ausente", async () => {
      await expect(printTicket()).resolves.toMatchObject({
        success: true,
        simulated: true,
      });
      await expect(printTicket("")).resolves.toMatchObject({ simulated: true });
    });

    it("no confunde un puente sin invoke con un entorno Electron", async () => {
      window.electronAPI = {};

      await expect(printTicket("TICKET")).resolves.toMatchObject({
        simulated: true,
      });
    });

    it("no emite logs de depuracion en ninguno de los caminos", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await printTicket("TICKET");
      installElectronBridge(() =>
        Promise.resolve({ success: false, error: "X" })
      );
      await printTicket("TICKET");

      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
