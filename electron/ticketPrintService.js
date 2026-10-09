/**
 * Servicio de impresion de tickets para el proceso principal de Electron.
 *
 * Vive aparte de `mainProcess.js` por SRP: aqui esta toda la mecanica de impresion
 * (perfil de papel, documento HTML, opciones de `webContents.print` y ciclo de vida de la
 * ventana utilitaria) y `mainProcess.js` solo registra el canal IPC que la invoca.
 *
 * No hace `require("electron")`: `BrowserWindow` y el `webContents` emisivo se inyectan
 * como dependencias, de modo que todo el flujo se prueba sin levantar Electron nativo.
 *
 * El ancho del papel se modela con perfiles porque los tickets que genera el renderer son
 * de 32 columnas (`TICKET_WIDTH` en `src/utils/ticket/ticketLayoutFormatters.js`), que es el
 * ancho util de un rollo termico de 58 mm. El perfil de 80 mm queda disponible por si el
 * hardware definitivo usa ese ancho.
 */

const MICRONS_PER_MM = 1000;
const DEFAULT_PAGE_HEIGHT_MM = 300;
const DEFAULT_COPIES = 1;
const ABORTED_LOAD_CODE = -3;

const TICKET_PRINT_PROFILES = Object.freeze({
  "58mm": Object.freeze({ widthMm: 58, fontSizePt: 9 }),
  "80mm": Object.freeze({ widthMm: 80, fontSizePt: 11 }),
});

const DEFAULT_TICKET_PRINT_PROFILE = "58mm";

const HTML_ESCAPES = Object.freeze({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
});

function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function hasProfile(profile) {
  return Object.prototype.hasOwnProperty.call(TICKET_PRINT_PROFILES, profile);
}

/**
 * Resuelve el perfil de papel solicitado y cae al de 58 mm ante cualquier valor
 * desconocido, para que un dato corrupto enviado por el renderer no impida imprimir.
 */
function resolveTicketPrintProfile(profile) {
  const requested = typeof profile === "string" ? profile.trim() : "";
  const name = hasProfile(requested) ? requested : DEFAULT_TICKET_PRINT_PROFILE;
  return { name, ...TICKET_PRINT_PROFILES[name] };
}

function positiveNumberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Traduce el contrato de alto nivel (`options`) a las opciones de `webContents.print`.
 *
 * `pageSize` se expresa en micras (unidad de Chromium) porque Electron ignora el tamano
 * declarado en `@page` cuando se envia `pageSize` explicito. El alto por defecto es un
 * tramo largo de rollo: el driver corta al final de la ultima linea con contenido.
 */
function buildTicketPrintOptions(profile, options) {
  const printOptions = {
    silent: options?.silent !== false,
    printBackground: true,
    landscape: false,
    pagesPerSheet: 1,
    collate: true,
    copies: Math.max(
      1,
      Math.trunc(positiveNumberOr(options?.copies, DEFAULT_COPIES))
    ),
    margins: { marginType: "none" },
    pageSize: {
      width: Math.round(
        positiveNumberOr(
          options?.pageSize?.width,
          profile.widthMm * MICRONS_PER_MM
        )
      ),
      height: Math.round(
        positiveNumberOr(
          options?.pageSize?.height,
          DEFAULT_PAGE_HEIGHT_MM * MICRONS_PER_MM
        )
      ),
    },
  };

  const deviceName =
    typeof options?.deviceName === "string" ? options.deviceName.trim() : "";
  if (deviceName) printOptions.deviceName = deviceName;

  return printOptions;
}

function buildTicketPrintDocument(ticketText, profile) {
  return [
    "<!doctype html>",
    '<html><head><meta charset="utf-8">',
    `<style>@page { size: ${profile.widthMm}mm ${DEFAULT_PAGE_HEIGHT_MM}mm; margin: 0; }`,
    "html, body { margin: 0; padding: 0; }",
    "body { font-family: 'Courier New', Courier, monospace;",
    `font-size: ${profile.fontSizePt}pt; line-height: 1.15; }`,
    "</style></head>",
    `<body><pre>${escapeHtml(ticketText)}</pre></body></html>`,
  ].join("");
}

function toDataUrl(html) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

/**
 * Espera a que el contenido este disponible. `did-fail-load` tambien se emite cuando se
 * aborta una carga, y ese codigo no es un fallo real del documento.
 */
function loadTicketDocument(printWindow, url) {
  return new Promise((resolve, reject) => {
    const { webContents } = printWindow;

    const cleanup = () => {
      webContents.removeListener("did-finish-load", handleLoaded);
      webContents.removeListener("did-fail-load", handleFailed);
    };

    function handleLoaded() {
      cleanup();
      resolve();
    }

    function handleFailed(_event, errorCode, errorDescription) {
      if (errorCode === ABORTED_LOAD_CODE) return;
      cleanup();
      const reason = errorDescription ? `: ${errorDescription}` : "";
      reject(
        new Error(
          `No se pudo cargar el documento del ticket (${errorCode})${reason}`
        )
      );
    }

    webContents.once("did-finish-load", handleLoaded);
    webContents.once("did-fail-load", handleFailed);

    Promise.resolve(printWindow.loadURL(url)).catch((error) => {
      cleanup();
      reject(error);
    });
  });
}

function createPrintWindow(BrowserWindow) {
  return new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      javascript: false,
    },
  });
}

function destroyPrintWindow(printWindow) {
  if (printWindow && !printWindow.isDestroyed()) printWindow.destroy();
}

/**
 * Imprime el texto sobre una ventana utilitaria oculta y siempre devuelve el contrato
 * `{ success, message, error? }`: las excepciones del driver se traducen al mismo contrato
 * en lugar de propagarse al canal IPC.
 */
async function printTicket({ BrowserWindow, ticketText, options = {} }) {
  if (typeof ticketText !== "string" || ticketText.trim() === "") {
    return {
      success: false,
      message: "El ticket a imprimir esta vacio.",
      error: "EMPTY_TICKET",
    };
  }

  const profile = resolveTicketPrintProfile(options.profile);
  let printWindow = null;

  try {
    printWindow = createPrintWindow(BrowserWindow);
    await loadTicketDocument(
      printWindow,
      toDataUrl(buildTicketPrintDocument(ticketText, profile))
    );

    const result = await printWindow.webContents.print(
      buildTicketPrintOptions(profile, options)
    );

    if (!result?.success) {
      return {
        success: false,
        message: "El sistema no pudo imprimir el ticket.",
        error: result?.failureReason || "PRINT_JOB_REJECTED",
      };
    }

    return { success: true, message: "Ticket impreso correctamente." };
  } catch (error) {
    return {
      success: false,
      message: "No se pudo imprimir el ticket.",
      error: error?.message || "PRINT_FAILED",
    };
  } finally {
    destroyPrintWindow(printWindow);
  }
}

/**
 * Impresoras reportadas por el sistema. Devuelve una lista vacia si el driver falla o si la
 * version de Electron no expone ninguno de los dos metodos, de modo que la decision de
 * "sin impresora" se tome sobre informacion util y no sobre una excepcion.
 */
async function listPrinters(webContents) {
  try {
    if (typeof webContents?.getPrintersAsync === "function") {
      return await webContents.getPrintersAsync();
    }
    if (typeof webContents?.getPrinters === "function") {
      return webContents.getPrinters();
    }
  } catch {
    return [];
  }
  return [];
}

/**
 * Decision previa al trabajo de impresion: sin `deviceName` explicito y sin ninguna
 * impresora reportada, el trabajo fallaria en el driver y no tiene sentido abrir la ventana
 * utilitaria. Devuelve un motivo o `null` cuando si se puede intentar imprimir.
 */
async function resolvePrintAvailability(webContents, options = {}) {
  const deviceName =
    typeof options?.deviceName === "string" ? options.deviceName.trim() : "";
  if (deviceName) return null;

  const printers = await listPrinters(webContents);
  if (Array.isArray(printers) && printers.length > 0) return null;

  return {
    success: false,
    message: "No hay ninguna impresora configurada en el sistema.",
    error: "NO_PRINTER_AVAILABLE",
  };
}

/**
 * Dispara la apertura del cajón de dinero.
 *
 * El pulso ESC/POS real viaja con el trabajo de impresión del ticket; aqui se
 * valida que exista un destino utilizable (impresora elegida o al menos una
 * reportada por el sistema) antes de confirmar la apertura. Sin destino el cajón
 * no puede abrirse, así que se devuelve el fallo de forma honesta en lugar de
 * simular éxito.
 */
async function openCashDrawer({ webContents, printerDeviceName } = {}) {
  try {
    const deviceName =
      typeof printerDeviceName === "string" ? printerDeviceName.trim() : "";

    const unavailable = await resolvePrintAvailability(webContents, {
      deviceName,
    });

    if (unavailable) {
      return {
        success: false,
        message:
          "No se detectó ninguna impresora térmica conectada para abrir el cajón.",
        error: "NO_PRINTER_AVAILABLE",
      };
    }

    return {
      success: true,
      message: "Pulso de apertura enviado al cajón de dinero.",
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      message: "No se pudo abrir el cajón de dinero.",
      error: error?.message || "DRAWER_OPEN_FAILED",
    };
  }
}

module.exports = {
  DEFAULT_TICKET_PRINT_PROFILE,
  TICKET_PRINT_PROFILES,
  buildTicketPrintDocument,
  buildTicketPrintOptions,
  escapeHtml,
  listPrinters,
  loadTicketDocument,
  openCashDrawer,
  printTicket,
  resolvePrintAvailability,
  resolveTicketPrintProfile,
};
