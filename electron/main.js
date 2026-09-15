// Módulos de Electron y utilidades del sistema
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const Store = require('electron-store').default;
const { randomUUID } = require('crypto');

// Variable para la ventana principal
let mainWindow = null;

const zoomStateByWebContentsId = new Map();
const zoomWindowsWithListeners = new WeakSet();

// Store para guardar datos persistentes del dispositivo
const store = new Store();

function getOrCreateDeviceCode() {
  let code = store.get('device_code');
  if (!code) {
    code = randomUUID();
    store.set('device_code', code);
  }
  return code;
}

function createMainWindow() {
  const iconPath = path.join(__dirname, '../icon.ico');

  // Configuración de la ventana principal
  mainWindow = new BrowserWindow({
    icon: iconPath,
    webPreferences: {
      // Configuración de seguridad para la ventana de renderizado
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  // Determina qué URL cargar según el entorno (desarrollo o producción)
  const appUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(appUrl);

  // Endurecimiento: bloquear ventanas emergentes y navegación fuera del origen de la app.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  const appOrigin = new URL(appUrl).origin;
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    try {
      if (new URL(targetUrl).origin !== appOrigin) {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  // Eventos de la ventana principal
  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setFullScreen(true);
    if (process.platform === 'darwin') app.dock.show();
  });

  // Limpia la referencia a la ventana cuando se cierra
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Abrir DevTools en desarrollo
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// Manejadores de IPC

// Devuelve el device_code único de esta PC
ipcMain.handle('get-device-code', async () => {
  return { deviceCode: getOrCreateDeviceCode() };
});

// Cerrar la aplicación
ipcMain.handle('close-app', async () => {
  app.quit();
  return { success: true };
});

ipcMain.handle('set-zoom-factor', async (event, zoomFactor) => {
  const parsed = Number(zoomFactor);
  const safeZoom = Number.isFinite(parsed) ? parsed : 1;
  event.sender.setZoomFactor(safeZoom);
  return { success: true };
});

function applyZoomForWebContents(webContents) {
  if (!webContents || webContents.isDestroyed()) return;
  const state = zoomStateByWebContentsId.get(webContents.id);
  if (!state) return;

  const win = BrowserWindow.fromWebContents(webContents);
  if (!win || win.isDestroyed()) return;

  const { width, height } = win.getContentBounds();
  const scaleX = width / state.baseWidth;
  const scaleY = height / state.baseHeight;
  const nextZoom = Math.min(scaleX, scaleY);

  const minZoom = Number.isFinite(state.minZoom) ? state.minZoom : 0.5;
  const maxZoom = Number.isFinite(state.maxZoom) ? state.maxZoom : 3;
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, nextZoom));

  if (Number.isFinite(state.lastZoom) && Math.abs(state.lastZoom - clampedZoom) < 0.01) {
    return;
  }

  state.lastZoom = clampedZoom;
  zoomStateByWebContentsId.set(webContents.id, state);
  webContents.setZoomFactor(clampedZoom);
}

ipcMain.handle('configure-zoom', async (event, config) => {
  const baseWidth = Number(config?.baseWidth);
  const baseHeight = Number(config?.baseHeight);

  if (!Number.isFinite(baseWidth) || !Number.isFinite(baseHeight) || baseWidth <= 0 || baseHeight <= 0) {
    return { success: false, message: 'Base inválida' };
  }

  zoomStateByWebContentsId.set(event.sender.id, {
    baseWidth,
    baseHeight,
    minZoom: Number(config?.minZoom),
    maxZoom: Number(config?.maxZoom),
    lastZoom: undefined
  });

  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !zoomWindowsWithListeners.has(win)) {
    zoomWindowsWithListeners.add(win);
    win.on('resize', () => applyZoomForWebContents(win.webContents));
    win.on('enter-full-screen', () => applyZoomForWebContents(win.webContents));
    win.on('leave-full-screen', () => applyZoomForWebContents(win.webContents));
  }

  applyZoomForWebContents(event.sender);
  return { success: true };
});

ipcMain.handle('reset-zoom', async (event) => {
  zoomStateByWebContentsId.delete(event.sender.id);
  if (!event.sender.isDestroyed()) {
    event.sender.setZoomFactor(1);
  }
  return { success: true };
});

ipcMain.handle('get-zoom-debug', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const contentBounds = win && !win.isDestroyed() ? win.getContentBounds() : null;
  const state = zoomStateByWebContentsId.get(event.sender.id) ?? null;
  const zoomFactor =
    event.sender && !event.sender.isDestroyed() && typeof event.sender.getZoomFactor === 'function'
      ? event.sender.getZoomFactor()
      : null;

  return {
    zoomFactor,
    contentBounds,
    state
  };
});

// Manejo de eventos de la aplicación

// Cierra la aplicación cuando todas las ventanas están cerradas (excepto en macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Crea una ventana si la aplicación se activa y no hay ninguna abierta (solo en macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Crea la ventana principal cuando Electron está listo
app.whenReady().then(() => {
  createMainWindow();
});
