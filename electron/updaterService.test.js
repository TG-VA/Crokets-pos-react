import { describe, it, expect, beforeEach, vi } from "vitest";

const { fakeAutoUpdater } = vi.hoisted(() => {
  const listeners = new Map();
  return {
    fakeAutoUpdater: {
      autoDownload: false,
      autoInstallOnAppQuit: false,
      allowPrerelease: false,
      requestHeaders: {},
      on: vi.fn((event, callback) => {
        listeners.set(event, callback);
      }),
      emit: (event, payload) => {
        listeners.get(event)?.(payload);
      },
      clearListeners: () => {
        listeners.clear();
      },
      checkForUpdates: vi.fn(() =>
        Promise.resolve({ updateInfo: { version: "1.0.1" } })
      ),
      quitAndInstall: vi.fn(),
    },
  };
});

vi.mock("electron", () => ({
  app: {
    getVersion: () => "1.0.0",
    isPackaged: true,
  },
  ipcMain: {
    handle: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

vi.mock("electron-updater", () => ({
  autoUpdater: fakeAutoUpdater,
  default: {
    autoUpdater: fakeAutoUpdater,
  },
}));

import updaterService from "./updaterService";

const {
  INITIAL_CHECK_DELAY_MS,
  UPDATE_STATUS_EVENT,
  configureAutoUpdater,
  createUpdaterState,
  resolveReadToken,
  broadcastStatus,
  loadEmbeddedUpdaterToken,
  registerUpdaterIpc,
  registerUpdaterEvents,
  scheduleInitialCheck,
  initAutoUpdater,
} = updaterService;

describe("electron/updaterService", () => {
  let fakeApp;
  let fakeIpcMain;
  let ipcHandlers;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    fakeAutoUpdater.clearListeners();
    fakeAutoUpdater.requestHeaders = {};

    fakeApp = {
      getVersion: vi.fn(() => "1.0.0"),
    };

    ipcHandlers = new Map();
    fakeIpcMain = {
      handle: vi.fn((channel, handler) => {
        ipcHandlers.set(channel, handler);
      }),
    };
  });

  describe("createUpdaterState", () => {
    it("crea un estado inicial limpio sin descarga", () => {
      const state = createUpdaterState();
      expect(state).toEqual({
        available: false,
        downloaded: false,
        version: null,
      });
    });
  });

  describe("resolveReadToken", () => {
    it("obtiene CROKETS_GH_READ_TOKEN del entorno o devuelve null", () => {
      expect(resolveReadToken({})).toBeNull();
      expect(resolveReadToken({ CROKETS_GH_READ_TOKEN: "secret-token" })).toBe(
        "secret-token"
      );
    });

    it("debe preferir el token de variable de entorno sobre el embebido", () => {
      expect(
        resolveReadToken(
          { CROKETS_GH_READ_TOKEN: "env-token" },
          { ghReadToken: "embedded-token" }
        )
      ).toBe("env-token");
    });

    it("debe devolver el token embebido si no hay variable de entorno", () => {
      expect(resolveReadToken({}, { ghReadToken: "embedded-token" })).toBe(
        "embedded-token"
      );
    });

    it("debe devolver null si no hay variable de entorno ni token embebido", () => {
      expect(resolveReadToken({}, {})).toBeNull();
    });

    it("debe manejar archivos de configuración corruptos o inexistentes sin arrojar excepciones", () => {
      expect(() => resolveReadToken({}, { ghReadToken: null })).not.toThrow();
      expect(() => resolveReadToken({})).not.toThrow();
      expect(loadEmbeddedUpdaterToken("/tmp/no-existe-config.json")).toBeNull();
    });
  });

  describe("broadcastStatus", () => {
    it("emite el evento update-status a todas las ventanas no destruidas", () => {
      const win1 = { isDestroyed: () => false, webContents: { send: vi.fn() } };
      const win2 = { isDestroyed: () => true, webContents: { send: vi.fn() } };
      const fakeBrowserWindow = {
        getAllWindows: () => [win1, win2],
      };

      const state = { available: true, downloaded: false, version: "1.0.1" };
      broadcastStatus(fakeBrowserWindow, state);

      expect(win1.webContents.send).toHaveBeenCalledWith(
        UPDATE_STATUS_EVENT,
        state
      );
      expect(win2.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe("configureAutoUpdater", () => {
    it("configura flags y cabecera de autorizacion con token", () => {
      configureAutoUpdater(
        { CROKETS_GH_READ_TOKEN: "abc123" },
        fakeAutoUpdater
      );
      expect(fakeAutoUpdater.autoDownload).toBe(true);
      expect(fakeAutoUpdater.autoInstallOnAppQuit).toBe(true);
      expect(fakeAutoUpdater.allowPrerelease).toBe(false);
      expect(fakeAutoUpdater.requestHeaders.Authorization).toBe("token abc123");
    });
  });

  describe("registerUpdaterIpc", () => {
    it("registra los cuatro canales IPC requeridos", () => {
      const state = createUpdaterState();
      registerUpdaterIpc({
        app: fakeApp,
        ipcMain: fakeIpcMain,
        state,
        checkForUpdates: vi.fn(),
        updater: fakeAutoUpdater,
      });

      expect(ipcHandlers.has("get-app-version")).toBe(true);
      expect(ipcHandlers.has("get-update-status")).toBe(true);
      expect(ipcHandlers.has("check-for-updates")).toBe(true);
      expect(ipcHandlers.has("quit-and-install-update")).toBe(true);
    });

    it("get-app-version devuelve la version del app", async () => {
      const state = createUpdaterState();
      registerUpdaterIpc({
        app: fakeApp,
        ipcMain: fakeIpcMain,
        state,
        checkForUpdates: vi.fn(),
        updater: fakeAutoUpdater,
      });

      const getAppVersionHandler = ipcHandlers.get("get-app-version");
      const version = await getAppVersionHandler();
      expect(version).toBe("1.0.0");
    });

    it("get-update-status devuelve una copia del estado", async () => {
      const state = { available: true, downloaded: true, version: "1.0.2" };
      registerUpdaterIpc({
        app: fakeApp,
        ipcMain: fakeIpcMain,
        state,
        checkForUpdates: vi.fn(),
        updater: fakeAutoUpdater,
      });

      const getStatusHandler = ipcHandlers.get("get-update-status");
      const result = await getStatusHandler();
      expect(result).toEqual(state);
    });

    it("check-for-updates delega y devuelve exito", async () => {
      const state = createUpdaterState();
      const checkForUpdates = vi.fn(() => Promise.resolve());
      registerUpdaterIpc({
        app: fakeApp,
        ipcMain: fakeIpcMain,
        state,
        checkForUpdates,
        updater: fakeAutoUpdater,
      });

      const checkHandler = ipcHandlers.get("check-for-updates");
      const result = await checkHandler();

      expect(checkForUpdates).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
    });

    it("check-for-updates captura errores y devuelve estructura de error", async () => {
      const state = createUpdaterState();
      const checkForUpdates = vi.fn(() =>
        Promise.reject(new Error("Network offline"))
      );
      registerUpdaterIpc({
        app: fakeApp,
        ipcMain: fakeIpcMain,
        state,
        checkForUpdates,
        updater: fakeAutoUpdater,
      });

      const checkHandler = ipcHandlers.get("check-for-updates");
      const result = await checkHandler();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network offline");
    });

    it("quit-and-install-update rechaza si la actualizacion no esta descargada", async () => {
      const state = { available: true, downloaded: false, version: "1.0.1" };
      registerUpdaterIpc({
        app: fakeApp,
        ipcMain: fakeIpcMain,
        state,
        checkForUpdates: vi.fn(),
        updater: fakeAutoUpdater,
      });

      const installHandler = ipcHandlers.get("quit-and-install-update");
      const result = await installHandler();

      expect(result.success).toBe(false);
      expect(fakeAutoUpdater.quitAndInstall).not.toHaveBeenCalled();
    });

    it("quit-and-install-update ejecuta quitAndInstall cuando esta descargada", async () => {
      vi.useFakeTimers();
      const state = { available: true, downloaded: true, version: "1.0.1" };
      registerUpdaterIpc({
        app: fakeApp,
        ipcMain: fakeIpcMain,
        state,
        checkForUpdates: vi.fn(),
        updater: fakeAutoUpdater,
      });

      const installHandler = ipcHandlers.get("quit-and-install-update");
      const result = await installHandler();

      expect(result.success).toBe(true);
      vi.runAllTimers();
      expect(fakeAutoUpdater.quitAndInstall).toHaveBeenCalledWith(false, true);
    });
  });

  describe("registerUpdaterEvents", () => {
    it("actualiza estado y notifica en update-available y update-downloaded", () => {
      const state = createUpdaterState();
      const win = { isDestroyed: () => false, webContents: { send: vi.fn() } };
      const fakeBrowserWindow = { getAllWindows: () => [win] };

      registerUpdaterEvents({
        BrowserWindow: fakeBrowserWindow,
        state,
        updater: fakeAutoUpdater,
      });

      fakeAutoUpdater.emit("update-available", { version: "2.0.0" });
      expect(state.available).toBe(true);
      expect(state.downloaded).toBe(false);
      expect(state.version).toBe("2.0.0");
      expect(win.webContents.send).toHaveBeenCalledWith(UPDATE_STATUS_EVENT, {
        available: true,
        downloaded: false,
        version: "2.0.0",
      });

      fakeAutoUpdater.emit("update-downloaded", { version: "2.0.0" });
      expect(state.downloaded).toBe(true);
      expect(win.webContents.send).toHaveBeenCalledWith(UPDATE_STATUS_EVENT, {
        available: true,
        downloaded: true,
        version: "2.0.0",
      });
    });

    it("captura errores de autoUpdater sin lanzar excepcion", () => {
      const state = createUpdaterState();
      const fakeBrowserWindow = { getAllWindows: () => [] };
      registerUpdaterEvents({
        BrowserWindow: fakeBrowserWindow,
        state,
        updater: fakeAutoUpdater,
      });

      expect(() => {
        fakeAutoUpdater.emit("error", new Error("Updater failure"));
      }).not.toThrow();
    });
  });

  describe("scheduleInitialCheck", () => {
    it("espera INITIAL_CHECK_DELAY_MS antes de consultar y permite cancelar", () => {
      vi.useFakeTimers();
      const checkForUpdates = vi.fn(() => Promise.resolve());

      const cancel = scheduleInitialCheck(checkForUpdates);
      expect(checkForUpdates).not.toHaveBeenCalled();

      vi.advanceTimersByTime(INITIAL_CHECK_DELAY_MS - 100);
      expect(checkForUpdates).not.toHaveBeenCalled();

      vi.advanceTimersByTime(200);
      expect(checkForUpdates).toHaveBeenCalledTimes(1);

      cancel();
    });
  });

  describe("initAutoUpdater", () => {
    it("en modo desarrollo (isDev: true) registra IPC pero no consulta ni escucha eventos", () => {
      const fakeBrowserWindow = { getAllWindows: () => [] };
      const result = initAutoUpdater({
        app: fakeApp,
        isDev: true,
        ipcMain: fakeIpcMain,
        BrowserWindow: fakeBrowserWindow,
        updater: fakeAutoUpdater,
      });

      expect(typeof result.getStatus).toBe("function");
      expect(result.cancelInitialCheck).toBeUndefined();
      expect(fakeAutoUpdater.on).not.toHaveBeenCalled();
    });

    it("en produccion (isDev: false) configura autoUpdater, registra eventos y agenda chequeo", () => {
      vi.useFakeTimers();
      const fakeBrowserWindow = { getAllWindows: () => [] };
      const env = { CROKETS_GH_READ_TOKEN: "tok123" };

      const result = initAutoUpdater({
        app: fakeApp,
        isDev: false,
        ipcMain: fakeIpcMain,
        BrowserWindow: fakeBrowserWindow,
        env,
        updater: fakeAutoUpdater,
      });

      expect(typeof result.getStatus).toBe("function");
      expect(typeof result.cancelInitialCheck).toBe("function");
      expect(fakeAutoUpdater.autoDownload).toBe(true);
      expect(fakeAutoUpdater.autoInstallOnAppQuit).toBe(true);
      expect(fakeAutoUpdater.requestHeaders.Authorization).toBe("token tok123");
      expect(fakeAutoUpdater.on).toHaveBeenCalled();

      result.cancelInitialCheck();
    });

    it("en produccion (isDev: false) configura autoUpdater usando token embebido si no hay variable de entorno", () => {
      vi.useFakeTimers();
      const fakeBrowserWindow = { getAllWindows: () => [] };

      const result = initAutoUpdater({
        app: fakeApp,
        isDev: false,
        ipcMain: fakeIpcMain,
        BrowserWindow: fakeBrowserWindow,
        env: {},
        embeddedConfig: { ghReadToken: "tok-embedded-123" },
        updater: fakeAutoUpdater,
      });

      expect(typeof result.getStatus).toBe("function");
      expect(fakeAutoUpdater.requestHeaders.Authorization).toBe(
        "token tok-embedded-123"
      );

      result.cancelInitialCheck();
    });
  });
});
