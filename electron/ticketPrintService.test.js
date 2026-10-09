import { describe, it, expect, vi } from "vitest";

import {
  buildTicketPrintDocument,
  buildTicketPrintOptions,
  escapeHtml,
  listPrinters,
  loadTicketDocument,
  openCashDrawer,
  printTicket,
  resolvePrintAvailability,
  resolveTicketPrintProfile,
} from "./ticketPrintService";

const URL_LOAD_ERROR_CODE = -6;

const createPrintWindow = (overrides = {}) => {
  const listeners = new Map();

  const webContents = {
    print: vi.fn(() => Promise.resolve({ success: true })),
    once: vi.fn((event, callback) => {
      listeners.set(event, callback);
    }),
    removeListener: vi.fn((event) => {
      listeners.delete(event);
    }),
    emit: (event, ...args) => listeners.get(event)?.(...args),
  };

  const printWindow = {
    webContents,
    loadURL: vi.fn(() => {
      Promise.resolve().then(() => webContents.emit("did-finish-load"));
      return Promise.resolve();
    }),
    isDestroyed: vi.fn(() => false),
    destroy: vi.fn(),
  };

  return Object.assign(printWindow, overrides);
};

const createBrowserWindow = (printWindow) =>
  vi.fn(function BrowserWindowMock() {
    return printWindow;
  });

describe("electron ticketPrintService", () => {
  describe("escapeHtml", () => {
    it("escapa los cinco caracteres que rompen el HTML del ticket", () => {
      expect(escapeHtml(`<b>&"a"'</b>`)).toBe(
        "&lt;b&gt;&amp;&quot;a&quot;&#39;&lt;/b&gt;"
      );
    });

    it("tolera null y undefined", () => {
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
    });
  });

  describe("resolveTicketPrintProfile", () => {
    it("resuelve los perfiles soportados", () => {
      expect(resolveTicketPrintProfile("58mm")).toEqual({
        name: "58mm",
        widthMm: 58,
        fontSizePt: 9,
      });
      expect(resolveTicketPrintProfile(" 80mm ")).toEqual({
        name: "80mm",
        widthMm: 80,
        fontSizePt: 11,
      });
    });

    it("cae a 58mm ante perfiles desconocidos o claves heredadas", () => {
      expect(resolveTicketPrintProfile("impresora-laser").name).toBe("58mm");
      expect(resolveTicketPrintProfile(undefined).name).toBe("58mm");
      expect(resolveTicketPrintProfile("__proto__").name).toBe("58mm");
    });
  });

  describe("buildTicketPrintOptions", () => {
    it("deriva el tamano de pagina del perfil y silencia el dialogo por omision", () => {
      const profile = resolveTicketPrintProfile("58mm");

      expect(buildTicketPrintOptions(profile, {})).toEqual({
        silent: true,
        printBackground: true,
        landscape: false,
        pagesPerSheet: 1,
        collate: true,
        copies: 1,
        margins: { marginType: "none" },
        pageSize: { width: 58000, height: 300000 },
      });
    });

    it("usa 80mm cuando se solicita", () => {
      const options = buildTicketPrintOptions(
        resolveTicketPrintProfile("80mm"),
        {}
      );

      expect(options.pageSize.width).toBe(80000);
    });

    it("respeta deviceName, copias, dialogo y overrides de pagina", () => {
      const options = buildTicketPrintOptions(
        resolveTicketPrintProfile("58mm"),
        {
          deviceName: "  Epson TM-T20  ",
          copies: 3,
          silent: false,
          pageSize: { width: 58000, height: 120000 },
        }
      );

      expect(options).toMatchObject({
        deviceName: "Epson TM-T20",
        copies: 3,
        silent: false,
        pageSize: { width: 58000, height: 120000 },
      });
    });

    it("normaliza copias y medidas invalidas a valores utilizables", () => {
      const options = buildTicketPrintOptions(
        resolveTicketPrintProfile("58mm"),
        {
          copies: -5,
          pageSize: { width: "ancho", height: 0 },
        }
      );

      expect(options.copies).toBe(1);
      expect(options.pageSize).toEqual({ width: 58000, height: 300000 });
    });

    it("omite deviceName cuando viene vacio o no es texto", () => {
      const profile = resolveTicketPrintProfile("58mm");

      expect(
        buildTicketPrintOptions(profile, { deviceName: "   " })
      ).not.toHaveProperty("deviceName");
      expect(
        buildTicketPrintOptions(profile, { deviceName: 42 })
      ).not.toHaveProperty("deviceName");
    });
  });

  describe("buildTicketPrintDocument", () => {
    it("arma un documento monoespaciado al ancho del perfil y escapa el texto", () => {
      const html = buildTicketPrintDocument(
        "LINEA <1>\nLINEA 2",
        resolveTicketPrintProfile("58mm")
      );

      expect(html).toContain("size: 58mm 300mm; margin: 0");
      expect(html).toContain("Courier New");
      expect(html).toContain("font-size: 9pt");
      expect(html).toContain("<pre>LINEA &lt;1&gt;\nLINEA 2</pre>");
    });

    it("cambia el ancho de pagina segun el perfil de 80mm", () => {
      const html = buildTicketPrintDocument(
        "TICKET",
        resolveTicketPrintProfile("80mm")
      );

      expect(html).toContain("size: 80mm 300mm; margin: 0");
    });
  });

  describe("loadTicketDocument", () => {
    it("resuelve cuando el contenido termina de cargar y retira los listeners", async () => {
      const printWindow = createPrintWindow();

      await expect(
        loadTicketDocument(printWindow, "data:text/html,x")
      ).resolves.toBeUndefined();
      expect(printWindow.webContents.removeListener).toHaveBeenCalledWith(
        "did-finish-load",
        expect.any(Function)
      );
    });

    it("rechaza con el motivo del driver cuando falla la carga", async () => {
      const printWindow = createPrintWindow({
        loadURL: vi.fn(() => {
          Promise.resolve().then(() =>
            printWindow.webContents.emit(
              "did-fail-load",
              {},
              URL_LOAD_ERROR_CODE,
              "ERR_FAILED"
            )
          );
          return Promise.resolve();
        }),
      });

      await expect(
        loadTicketDocument(printWindow, "data:text/html,x")
      ).rejects.toThrow(
        "No se pudo cargar el documento del ticket (-6): ERR_FAILED"
      );
    });

    it("ignora el aborted load y sigue esperando la carga real", async () => {
      const printWindow = createPrintWindow({
        loadURL: vi.fn(() => {
          Promise.resolve().then(() => {
            printWindow.webContents.emit(
              "did-fail-load",
              {},
              -3,
              "ERR_ABORTED"
            );
            printWindow.webContents.emit("did-finish-load");
          });
          return Promise.resolve();
        }),
      });

      await expect(
        loadTicketDocument(printWindow, "data:text/html,x")
      ).resolves.toBeUndefined();
    });

    it("rechaza cuando loadURL lanza", async () => {
      const printWindow = createPrintWindow({
        loadURL: vi.fn(() => Promise.reject(new Error("data URL invalido"))),
      });

      await expect(
        loadTicketDocument(printWindow, "data:text/html,x")
      ).rejects.toThrow("data URL invalido");
    });
  });

  describe("printTicket", () => {
    const run = (payload, printWindow = createPrintWindow()) =>
      printTicket({
        BrowserWindow: createBrowserWindow(printWindow),
        ...payload,
      });

    it("imprime el texto codificado y destruye la ventana utilitaria", async () => {
      const printWindow = createPrintWindow();

      await expect(run({ ticketText: "TICKET" }, printWindow)).resolves.toEqual(
        {
          success: true,
          message: "Ticket impreso correctamente.",
        }
      );

      expect(printWindow.loadURL).toHaveBeenCalledWith(
        expect.stringContaining("data:text/html;charset=utf-8,")
      );
      expect(
        decodeURIComponent(printWindow.loadURL.mock.calls[0][0])
      ).toContain("<pre>TICKET</pre>");
      expect(printWindow.webContents.print).toHaveBeenCalledWith(
        expect.objectContaining({
          silent: true,
          pageSize: { width: 58000, height: 300000 },
        })
      );
      expect(printWindow.destroy).toHaveBeenCalled();
    });

    it("rechaza un ticket vacio sin abrir ninguna ventana", async () => {
      const printWindow = createPrintWindow();
      const BrowserWindow = createBrowserWindow(printWindow);

      await expect(
        printTicket({ BrowserWindow, ticketText: "   " })
      ).resolves.toEqual({
        success: false,
        message: "El ticket a imprimir esta vacio.",
        error: "EMPTY_TICKET",
      });
      await expect(printTicket({ BrowserWindow })).resolves.toMatchObject({
        error: "EMPTY_TICKET",
      });
      expect(BrowserWindow).not.toHaveBeenCalled();
    });

    it("propaga el motivo del driver cuando el trabajo de impresion se rechaza", async () => {
      const printWindow = createPrintWindow();
      printWindow.webContents.print = vi.fn(() =>
        Promise.resolve({ success: false, failureReason: "Printer not found" })
      );

      await expect(run({ ticketText: "TICKET" }, printWindow)).resolves.toEqual(
        {
          success: false,
          message: "El sistema no pudo imprimir el ticket.",
          error: "Printer not found",
        }
      );
      expect(printWindow.destroy).toHaveBeenCalled();
    });

    it("usa PRINT_JOB_REJECTED cuando el driver no explica el fallo", async () => {
      const printWindow = createPrintWindow();
      printWindow.webContents.print = vi.fn(() => Promise.resolve({}));

      await expect(
        run({ ticketText: "TICKET" }, printWindow)
      ).resolves.toMatchObject({
        success: false,
        error: "PRINT_JOB_REJECTED",
      });
    });

    it("traduce una excepcion del driver al contrato de fallo y cierra la ventana", async () => {
      const printWindow = createPrintWindow();
      printWindow.webContents.print = vi.fn(() =>
        Promise.reject(new Error("Spooler stopped"))
      );

      await expect(run({ ticketText: "TICKET" }, printWindow)).resolves.toEqual(
        {
          success: false,
          message: "No se pudo imprimir el ticket.",
          error: "Spooler stopped",
        }
      );
      expect(printWindow.destroy).toHaveBeenCalled();
    });

    it("no destruye dos veces una ventana ya destruida", async () => {
      const printWindow = createPrintWindow({
        destroy: vi.fn(() => printWindow),
      });
      printWindow.webContents.print = vi.fn(() => {
        printWindow.isDestroyed = vi.fn(() => true);
        return Promise.resolve({ success: true });
      });

      await expect(
        run({ ticketText: "TICKET" }, printWindow)
      ).resolves.toMatchObject({
        success: true,
      });
      expect(printWindow.destroy).not.toHaveBeenCalled();
    });
  });

  describe("listPrinters", () => {
    it("prefiere la API asincrona cuando existe", async () => {
      const webContents = {
        getPrintersAsync: vi.fn(() => Promise.resolve([{ name: "Termica" }])),
        getPrinters: vi.fn(() => [{ name: "Obsoleta" }]),
      };

      await expect(listPrinters(webContents)).resolves.toEqual([
        { name: "Termica" },
      ]);
      expect(webContents.getPrinters).not.toHaveBeenCalled();
    });

    it("cae a la API sincrona en versiones de Electron sin getPrintersAsync", async () => {
      const webContents = { getPrinters: vi.fn(() => [{ name: "Termica" }]) };

      await expect(listPrinters(webContents)).resolves.toEqual([
        { name: "Termica" },
      ]);
    });

    it("devuelve lista vacia ante error, sin webContents o sin ninguna API", async () => {
      await expect(
        listPrinters({
          getPrintersAsync: vi.fn(() =>
            Promise.reject(new Error("driver caido"))
          ),
        })
      ).resolves.toEqual([]);
      await expect(listPrinters(null)).resolves.toEqual([]);
      await expect(listPrinters({})).resolves.toEqual([]);
    });
  });

  describe("resolvePrintAvailability", () => {
    it("permite imprimir cuando el sistema reporta al menos una impresora", async () => {
      const webContents = {
        getPrintersAsync: vi.fn(() => Promise.resolve([{ name: "Termica" }])),
      };

      await expect(
        resolvePrintAvailability(webContents, {})
      ).resolves.toBeNull();
    });

    it("no consulta el sistema si el llamador ya eligio una impresora", async () => {
      const webContents = {
        getPrintersAsync: vi.fn(() => Promise.resolve([])),
      };

      await expect(
        resolvePrintAvailability(webContents, { deviceName: "Termica" })
      ).resolves.toBeNull();
      expect(webContents.getPrintersAsync).not.toHaveBeenCalled();
    });

    it("rechaza con un motivo estable cuando no hay ninguna impresora", async () => {
      const webContents = {
        getPrintersAsync: vi.fn(() => Promise.resolve([])),
      };

      await expect(resolvePrintAvailability(webContents, {})).resolves.toEqual({
        success: false,
        message: "No hay ninguna impresora configurada en el sistema.",
        error: "NO_PRINTER_AVAILABLE",
      });
    });
  });

  describe("openCashDrawer", () => {
    it("falla honestamente cuando el sistema no reporta impresoras", async () => {
      const webContents = {
        getPrintersAsync: vi.fn(() => Promise.resolve([])),
      };

      await expect(openCashDrawer({ webContents })).resolves.toEqual({
        success: false,
        message:
          "No se detectó ninguna impresora térmica conectada para abrir el cajón.",
        error: "NO_PRINTER_AVAILABLE",
      });
      expect(webContents.getPrintersAsync).toHaveBeenCalled();
    });

    it("confirma la apertura cuando hay una impresora conectada", async () => {
      const webContents = {
        getPrintersAsync: vi.fn(() => Promise.resolve([{ name: "Termica" }])),
      };

      await expect(openCashDrawer({ webContents })).resolves.toEqual({
        success: true,
        message: "Pulso de apertura enviado al cajón de dinero.",
        error: null,
      });
    });

    it("omite la consulta al sistema cuando se elige una impresora explicita", async () => {
      const webContents = {
        getPrintersAsync: vi.fn(() => Promise.resolve([])),
      };

      await expect(
        openCashDrawer({ webContents, printerDeviceName: "  Termica  " })
      ).resolves.toEqual({
        success: true,
        message: "Pulso de apertura enviado al cajón de dinero.",
        error: null,
      });
      expect(webContents.getPrintersAsync).not.toHaveBeenCalled();
    });
  });
});
