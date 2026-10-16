const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");
const Store = require("electron-store").default;
const { randomUUID } = require("crypto");

const {
  createMainWindow,
  registerAppLifecycle,
  registerIpcHandlers,
} = require("./mainProcess");
const { initAutoUpdater } = require("./updaterService");

// Store para guardar datos persistentes del dispositivo.
const store = new Store();

// Estado de la ventana principal y del zoom por webContents.
const windowState = { mainWindow: null };
const zoomStateByWebContentsId = new Map();
const zoomWindowsWithListeners = new WeakSet();

registerIpcHandlers({
  app,
  ipcMain,
  BrowserWindow,
  store,
  randomUUID,
  zoomStateByWebContentsId,
  zoomWindowsWithListeners,
});

const openMainWindow = () =>
  createMainWindow({
    BrowserWindow,
    app,
    isDev,
    path,
    dirname: __dirname,
    windowState,
  });

registerAppLifecycle({ app, BrowserWindow, createWindow: openMainWindow });

// Actualizaciones desatendidas: se inicializa tras crear la ventana principal.
// El servicio registra los canales IPC y agenda una consulta silenciosa diferida.
app.whenReady().then(() => {
  initAutoUpdater({ app, isDev, ipcMain, BrowserWindow });
});
