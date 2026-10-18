function getAutoUpdater() {
  return require("electron-updater").autoUpdater;
}

// Verificacion diferida para no competir con el arranque del POS ni con la carga
// inicial de ventas.
const INITIAL_CHECK_DELAY_MS = 10000;

// Evento push del proceso principal hacia el renderer (exponer via preload).
const UPDATE_STATUS_EVENT = "update-status";

function createUpdaterState() {
  return { available: false, downloaded: false, version: null };
}

// Token de lectura dedicado para el feed de GitHub Releases. Sin prefijo VITE_
// a proposito: Vite incrustaria la credencial en el bundle del renderer.
// El provider de GitHub (publish.private = true) ya consume GH_TOKEN/GITHUB_TOKEN
// del entorno; esta variable permite usar un token de lectura acotado.
const READ_TOKEN_ENV_VAR = "CROKETS_GH_READ_TOKEN";

// Ruta del archivo de configuración embebido para el token del auto-updater.
const EMBEDDED_UPDATER_CONFIG_PATH = "./updaterConfig.json";

// Carga el token de lectura embebido desde el archivo de configuración.
// Debe ser tolerante a errores: si el archivo no existe o está corrupto,
// devuelve null sin arrojar excepciones.
function loadEmbeddedUpdaterToken(configPath = EMBEDDED_UPDATER_CONFIG_PATH) {
  try {
    const fs = require("fs");
    const path = require("path");
    const resolvedPath = path.isAbsolute(configPath)
      ? configPath
      : path.resolve(__dirname, configPath);
    if (!fs.existsSync(resolvedPath)) {
      return null;
    }
    const raw = fs.readFileSync(resolvedPath, "utf8");
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.ghReadToken === "string" &&
      parsed.ghReadToken.trim()
    ) {
      return parsed.ghReadToken.trim();
    }
    return null;
  } catch {
    return null;
  }
}

// Token de lectura dedicado para el feed del repositorio privado.
// Jerarquía: 1) Variable de entorno, 2) Token embebido, 3) null
function resolveReadToken(env, embeddedConfig) {
  const envToken = env?.[READ_TOKEN_ENV_VAR] || env?.GH_TOKEN || null;
  if (envToken) {
    return envToken;
  }
  if (typeof embeddedConfig !== "undefined") {
    if (
      embeddedConfig &&
      typeof embeddedConfig.ghReadToken === "string" &&
      embeddedConfig.ghReadToken.trim()
    ) {
      return embeddedConfig.ghReadToken.trim();
    }
    return null;
  }
  return loadEmbeddedUpdaterToken();
}

function configureAutoUpdater(env, updater = getAutoUpdater(), embeddedConfig) {
  if (!updater) {
    return;
  }

  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.allowPrerelease = false;
  updater.logger = console;

  const token = resolveReadToken(env, embeddedConfig);
  if (token) {
    // electron-updater requiere GH_TOKEN en el entorno para instanciar PrivateGitHubProvider
    // en lugar del GitHubProvider publico para repositorios privados.
    process.env.GH_TOKEN = process.env.GH_TOKEN || token;

    updater.requestHeaders = {
      ...(updater.requestHeaders ?? {}),
      Authorization: `token ${token}`,
    };

    if (typeof updater.setFeedURL === "function") {
      try {
        updater.setFeedURL({
          provider: "github",
          owner: "TG-VA",
          repo: "Crokets-pos-react",
          private: true,
          token,
        });
      } catch (err) {
        console.error("Error al configurar feed URL del auto-updater:", err);
      }
    }
  }
}

// Notifica a todas las ventanas vivas el estado vigente de la actualizacion.
function broadcastStatus(BrowserWindow, state) {
  const payload = { ...state };
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(UPDATE_STATUS_EVENT, payload);
    }
  });
  return payload;
}

function registerUpdaterIpc({ app, ipcMain, state, checkForUpdates, updater }) {
  const getStatus = () => ({ ...state });

  ipcMain.handle("get-app-version", async () => app.getVersion());

  ipcMain.handle("get-update-status", async () => getStatus());

  ipcMain.handle("check-for-updates", async () => {
    try {
      if (typeof checkForUpdates === "function") {
        await checkForUpdates();
      }
      return { success: true, ...getStatus() };
    } catch (error) {
      console.error("Error al consultar actualizaciones:", error);
      return {
        success: false,
        message: "No se pudo consultar el servidor de actualizaciones.",
        error: error?.message || "CHECK_FOR_UPDATES_FAILED",
      };
    }
  });

  ipcMain.handle("quit-and-install-update", async () => {
    if (!state.downloaded) {
      return { success: false, message: "No hay una actualizacion lista." };
    }

    const resolvedUpdater = updater || getAutoUpdater();
    // Diferir el reinicio para que la respuesta IPC alcance al renderer.
    setTimeout(() => resolvedUpdater?.quitAndInstall(false, true), 0);
    return { success: true };
  });

  return getStatus;
}

function registerUpdaterEvents({ BrowserWindow, state, updater }) {
  const targetUpdater = updater || getAutoUpdater();
  if (!targetUpdater?.on) {
    return;
  }

  targetUpdater.on("update-available", (info) => {
    state.available = true;
    state.version = info?.version ?? null;
    broadcastStatus(BrowserWindow, state);
  });

  targetUpdater.on("update-downloaded", (info) => {
    state.available = true;
    state.downloaded = true;
    state.version = info?.version ?? state.version;
    broadcastStatus(BrowserWindow, state);
  });

  targetUpdater.on("error", (error) => {
    console.error("Error en auto-updater:", error);
  });
}

function scheduleInitialCheck(checkForUpdates) {
  const timer = setTimeout(() => {
    checkForUpdates().catch((error) => {
      console.error(
        "Error en la verificacion inicial de actualizaciones:",
        error
      );
    });
  }, INITIAL_CHECK_DELAY_MS);

  return () => clearTimeout(timer);
}

function initAutoUpdater({
  app,
  isDev,
  ipcMain,
  BrowserWindow,
  env = process.env,
  updater,
  embeddedConfig,
}) {
  const state = createUpdaterState();
  const getResolvedUpdater = () => updater || (isDev ? null : getAutoUpdater());
  const checkForUpdates = () => {
    const targetUpdater = getResolvedUpdater();
    return targetUpdater?.checkForUpdates
      ? targetUpdater.checkForUpdates()
      : Promise.resolve();
  };

  // Los handlers IPC se registran siempre: en desarrollo el Footer necesita la
  // version y el estado (vacio) para renderizar sin romperse.
  const getStatus = registerUpdaterIpc({
    app,
    ipcMain,
    state,
    checkForUpdates,
    updater: updater || null,
  });

  // En desarrollo no se consulta ni descarga nada: el bundle corre desde Vite.
  if (isDev) {
    return { getStatus };
  }

  const activeUpdater = getResolvedUpdater();
  configureAutoUpdater(env, activeUpdater, embeddedConfig);
  registerUpdaterEvents({ BrowserWindow, state, updater: activeUpdater });

  const cancelInitialCheck = scheduleInitialCheck(checkForUpdates);

  return { getStatus, cancelInitialCheck };
}

module.exports = {
  INITIAL_CHECK_DELAY_MS,
  UPDATE_STATUS_EVENT,
  broadcastStatus,
  configureAutoUpdater,
  createUpdaterState,
  getAutoUpdater,
  initAutoUpdater,
  loadEmbeddedUpdaterToken,
  registerUpdaterEvents,
  registerUpdaterIpc,
  resolveReadToken,
  scheduleInitialCheck,
};
