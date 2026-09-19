const ZOOM_MIN_DEFAULT = 0.5;
const ZOOM_MAX_DEFAULT = 3;
const ZOOM_STEP_EPSILON = 0.01;

function getOrCreateDeviceCode(store, randomUUID) {
  let code = store.get("device_code");
  if (!code) {
    code = randomUUID();
    store.set("device_code", code);
  }
  return code;
}

function normalizeZoomFactor(zoomFactor) {
  const parsed = Number(zoomFactor);
  return Number.isFinite(parsed) ? parsed : 1;
}

function applyZoomForWebContents({
  webContents,
  zoomStateByWebContentsId,
  BrowserWindow,
}) {
  if (!webContents || webContents.isDestroyed()) return;

  const state = zoomStateByWebContentsId.get(webContents.id);
  if (!state) return;

  const win = BrowserWindow.fromWebContents(webContents);
  if (!win || win.isDestroyed()) return;

  const { width, height } = win.getContentBounds();
  const scaleX = width / state.baseWidth;
  const scaleY = height / state.baseHeight;
  const nextZoom = Math.min(scaleX, scaleY);

  const minZoom = Number.isFinite(state.minZoom)
    ? state.minZoom
    : ZOOM_MIN_DEFAULT;
  const maxZoom = Number.isFinite(state.maxZoom)
    ? state.maxZoom
    : ZOOM_MAX_DEFAULT;
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, nextZoom));

  if (
    Number.isFinite(state.lastZoom) &&
    Math.abs(state.lastZoom - clampedZoom) < ZOOM_STEP_EPSILON
  ) {
    return;
  }

  state.lastZoom = clampedZoom;
  zoomStateByWebContentsId.set(webContents.id, state);
  webContents.setZoomFactor(clampedZoom);
}

function createMainWindow({
  BrowserWindow,
  app,
  isDev,
  path,
  dirname,
  windowState,
}) {
  const iconPath = path.join(dirname, "../icon.ico");

  const win = new BrowserWindow({
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(dirname, "preload.js"),
    },
    show: false,
  });

  windowState.mainWindow = win;

  const appUrl = isDev
    ? "http://localhost:5173"
    : `file://${path.join(dirname, "../dist/index.html")}`;

  win.loadURL(appUrl);

  // Endurecimiento: bloquear ventanas emergentes y navegación fuera del origen de la app.
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  const appOrigin = new URL(appUrl).origin;
  win.webContents.on("will-navigate", (event, targetUrl) => {
    try {
      if (new URL(targetUrl).origin !== appOrigin) {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  win.on("ready-to-show", () => {
    win.show();
    win.setFullScreen(true);
    if (process.platform === "darwin") app.dock.show();
  });

  win.on("closed", () => {
    windowState.mainWindow = null;
  });

  if (isDev) {
    win.webContents.openDevTools({ mode: "detach" });
  }

  return win;
}

function registerIpcHandlers({
  app,
  ipcMain,
  BrowserWindow,
  store,
  randomUUID,
  zoomStateByWebContentsId,
  zoomWindowsWithListeners,
}) {
  // Devuelve el device_code único de esta PC.
  ipcMain.handle("get-device-code", async () => {
    return { deviceCode: getOrCreateDeviceCode(store, randomUUID) };
  });

  // Cerrar la aplicación.
  ipcMain.handle("close-app", async () => {
    app.quit();
    return { success: true };
  });

  ipcMain.handle("set-zoom-factor", async (event, zoomFactor) => {
    event.sender.setZoomFactor(normalizeZoomFactor(zoomFactor));
    return { success: true };
  });

  ipcMain.handle("configure-zoom", async (event, config) => {
    const baseWidth = Number(config?.baseWidth);
    const baseHeight = Number(config?.baseHeight);

    if (
      !Number.isFinite(baseWidth) ||
      !Number.isFinite(baseHeight) ||
      baseWidth <= 0 ||
      baseHeight <= 0
    ) {
      return { success: false, message: "Base inválida" };
    }

    zoomStateByWebContentsId.set(event.sender.id, {
      baseWidth,
      baseHeight,
      minZoom: Number(config?.minZoom),
      maxZoom: Number(config?.maxZoom),
      lastZoom: undefined,
    });

    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !zoomWindowsWithListeners.has(win)) {
      zoomWindowsWithListeners.add(win);
      const reapplyZoom = () =>
        applyZoomForWebContents({
          webContents: win.webContents,
          zoomStateByWebContentsId,
          BrowserWindow,
        });
      win.on("resize", reapplyZoom);
      win.on("enter-full-screen", reapplyZoom);
      win.on("leave-full-screen", reapplyZoom);
    }

    applyZoomForWebContents({
      webContents: event.sender,
      zoomStateByWebContentsId,
      BrowserWindow,
    });
    return { success: true };
  });

  ipcMain.handle("reset-zoom", async (event) => {
    zoomStateByWebContentsId.delete(event.sender.id);
    if (!event.sender.isDestroyed()) {
      event.sender.setZoomFactor(1);
    }
    return { success: true };
  });

  ipcMain.handle("get-zoom-debug", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const contentBounds =
      win && !win.isDestroyed() ? win.getContentBounds() : null;
    const state = zoomStateByWebContentsId.get(event.sender.id) ?? null;
    const zoomFactor =
      event.sender &&
      !event.sender.isDestroyed() &&
      typeof event.sender.getZoomFactor === "function"
        ? event.sender.getZoomFactor()
        : null;

    return { zoomFactor, contentBounds, state };
  });
}

function registerAppLifecycle({ app, BrowserWindow, createWindow }) {
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.whenReady().then(createWindow);
}

module.exports = {
  applyZoomForWebContents,
  createMainWindow,
  getOrCreateDeviceCode,
  registerAppLifecycle,
  registerIpcHandlers,
};
