const fs = require("fs");
const path = require("path");

function createPdfWindow(BrowserWindow) {
  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      javascript: false,
    },
  });

  return pdfWindow;
}

async function loadDocument(pdfWindow, html) {
  if (!pdfWindow || pdfWindow.isDestroyed()) {
    throw new Error("PDF_WINDOW_DESTROYED");
  }
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  await pdfWindow.loadURL(dataUrl);
}

async function exportOrderPdf({
  BrowserWindow,
  dialog,
  parentWindow,
  html,
  fileName,
} = {}) {
  let pdfWindow = null;

  try {
    if (typeof html !== "string" || html.trim().length === 0) {
      return {
        success: false,
        message: "El documento del pedido esta vacio.",
        error: "EMPTY_DOCUMENT",
      };
    }

    if (typeof BrowserWindow !== "function") {
      return {
        success: false,
        message: "No se pudo exportar el pedido a PDF.",
        error: "BROWSERWINDOW_REQUIRED",
      };
    }

    pdfWindow = createPdfWindow(BrowserWindow);
    await loadDocument(pdfWindow, html);

    const buffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
    });

    const defaultPath =
      typeof fileName === "string" && fileName.trim()
        ? fileName.trim()
        : "Pedido.pdf";

    const result = await dialog.showSaveDialog(parentWindow || undefined, {
      title: "Guardar pedido en PDF",
      defaultPath,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });

    if (!result || result.canceled || !result.filePath) {
      return {
        success: true,
        canceled: true,
        message: "Exportacion cancelada.",
      };
    }

    await fs.promises.writeFile(result.filePath, buffer);

    return {
      success: true,
      message: "Pedido exportado a PDF correctamente.",
    };
  } catch (error) {
    return {
      success: false,
      message: "No se pudo exportar el pedido a PDF.",
      error: error?.message || "PDF_EXPORT_FAILED",
    };
  } finally {
    if (pdfWindow && !pdfWindow.isDestroyed()) {
      try {
        pdfWindow.close();
      } catch {
        // ignore
      }
    }
  }
}

module.exports = {
  createPdfWindow,
  loadDocument,
  exportOrderPdf,
};
