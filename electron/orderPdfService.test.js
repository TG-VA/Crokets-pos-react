const { describe, it, expect, vi, beforeEach } = require("vitest");

const writeFileMock = vi.fn(async () => undefined);
vi.mock("fs", () => ({
  promises: {
    writeFile: writeFileMock,
  },
}));

const {
  createPdfWindow,
  exportOrderPdf,
  loadDocument,
} = require("./orderPdfService");

describe("orderPdfService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createPdfWindow creates hidden window with hardened webPreferences", () => {
    const BrowserWindow = vi.fn(function (opts) {
      this.opts = opts;
      return this;
    });
    const win = createPdfWindow(BrowserWindow);
    expect(BrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          javascript: false,
        },
      })
    );
    expect(win).toBeDefined();
  });

  it("loadDocument loads data URL and throws if destroyed", async () => {
    const loadURL = vi.fn(async () => undefined);
    const pdfWindow = { isDestroyed: () => false, loadURL };
    await loadDocument(pdfWindow, "<html>test</html>");
    expect(loadURL).toHaveBeenCalledWith(
      expect.stringContaining("data:text/html;charset=utf-8,")
    );

    const destroyed = { isDestroyed: () => true, loadURL };
    await expect(loadDocument(destroyed, "<html></html>")).rejects.toThrow(
      "PDF_WINDOW_DESTROYED"
    );
  });

  it("exportOrderPdf writes file on success", async () => {
    const close = vi.fn();
    const pdfWindow = {
      isDestroyed: () => false,
      close,
      webContents: {
        printToPDF: vi.fn(async () => Buffer.from("%PDF-1.4")),
      },
      loadURL: vi.fn(async () => undefined),
    };
    const BrowserWindow = vi.fn(function () {
      return pdfWindow;
    });
    const dialog = {
      showSaveDialog: vi.fn(async () => ({
        canceled: false,
        filePath: "/tmp/pedido.pdf",
      })),
    };

    const result = await exportOrderPdf({
      BrowserWindow,
      dialog,
      parentWindow: {},
      html: "<html></html>",
      fileName: "Pedido.pdf",
    });

    expect(writeFileMock).toHaveBeenCalledWith(
      "/tmp/pedido.pdf",
      expect.any(Buffer)
    );
    expect(result).toEqual({
      success: true,
      message: "Pedido exportado a PDF correctamente.",
    });
    expect(close).toHaveBeenCalled();
  });

  it("exportOrderPdf returns canceled when dialog canceled", async () => {
    const close = vi.fn();
    const pdfWindow = {
      isDestroyed: () => false,
      close,
      webContents: { printToPDF: vi.fn(async () => Buffer.from("%PDF")) },
      loadURL: vi.fn(async () => undefined),
    };
    const BrowserWindow = vi.fn(function () {
      return pdfWindow;
    });
    const dialog = { showSaveDialog: vi.fn(async () => ({ canceled: true })) };

    const result = await exportOrderPdf({
      BrowserWindow,
      dialog,
      parentWindow: {},
      html: "<html></html>",
      fileName: "Pedido.pdf",
    });

    expect(writeFileMock).not.toHaveBeenCalled();
    expect(result.canceled).toBe(true);
    expect(close).toHaveBeenCalled();
  });

  it("exportOrderPdf returns EMPTY_DOCUMENT for empty html", async () => {
    const BrowserWindow = vi.fn();
    const dialog = { showSaveDialog: vi.fn() };
    const result = await exportOrderPdf({ BrowserWindow, dialog, html: "   " });
    expect(result).toEqual({
      success: false,
      message: "El documento del pedido esta vacio.",
      error: "EMPTY_DOCUMENT",
    });
    expect(BrowserWindow).not.toHaveBeenCalled();
  });

  it("exportOrderPdf handles printToPDF errors", async () => {
    const close = vi.fn();
    const pdfWindow = {
      isDestroyed: () => false,
      close,
      webContents: {
        printToPDF: vi.fn(async () => {
          throw new Error("fail");
        }),
      },
      loadURL: vi.fn(async () => undefined),
    };
    const BrowserWindow = vi.fn(function () {
      return pdfWindow;
    });
    const dialog = { showSaveDialog: vi.fn() };

    const result = await exportOrderPdf({
      BrowserWindow,
      dialog,
      html: "<html></html>",
    });
    expect(result.success).toBe(false);
    expect(result.message).toBe("No se pudo exportar el pedido a PDF.");
    expect(close).toHaveBeenCalled();
  });

  it("exportOrderPdf uses default filename when missing", async () => {
    const close = vi.fn();
    const pdfWindow = {
      isDestroyed: () => false,
      close,
      webContents: { printToPDF: vi.fn(async () => Buffer.from("%PDF")) },
      loadURL: vi.fn(async () => undefined),
    };
    const BrowserWindow = vi.fn(function () {
      return pdfWindow;
    });
    const dialog = { showSaveDialog: vi.fn(async () => ({ canceled: true })) };

    await exportOrderPdf({ BrowserWindow, dialog, html: "<html></html>" });
    expect(dialog.showSaveDialog).toHaveBeenCalled();
    const call = dialog.showSaveDialog.mock.calls[0];
    expect(call[1]).toEqual(
      expect.objectContaining({ defaultPath: "Pedido.pdf" })
    );
    expect(close).toHaveBeenCalled();
  });
});
