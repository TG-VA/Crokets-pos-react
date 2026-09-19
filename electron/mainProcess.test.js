import { describe, it, expect, afterEach, vi } from "vitest";
import path from "node:path";

import {
  applyZoomForWebContents,
  createMainWindow,
  getOrCreateDeviceCode,
  registerAppLifecycle,
  registerIpcHandlers,
} from "./mainProcess";

const IPC_CHANNELS = [
  "get-device-code",
  "close-app",
  "set-zoom-factor",
  "configure-zoom",
  "reset-zoom",
  "get-zoom-debug",
];

const originalPlatform = process.platform;

const setPlatform = (value) => {
  Object.defineProperty(process, "platform", { value, configurable: true });
};

const createWebContents = (overrides = {}) => ({
  id: 1,
  setZoomFactor: vi.fn(),
  getZoomFactor: vi.fn(() => 1),
  isDestroyed: vi.fn(() => false),
  openDevTools: vi.fn(),
  setWindowOpenHandler: vi.fn(),
  on: vi.fn(),
  ...overrides,
});

const createFakeWindow = (webContents) => {
  const handlers = {};
  const webContentsHandlers = {};

  return {
    webContents:
      webContents ??
      createWebContents({
        on: vi.fn((event, callback) => {
          webContentsHandlers[event] = callback;
        }),
      }),
    loadURL: vi.fn(),
    on: vi.fn((event, callback) => {
      handlers[event] = callback;
    }),
    show: vi.fn(),
    setFullScreen: vi.fn(),
    getContentBounds: vi.fn(() => ({ width: 800, height: 600 })),
    isDestroyed: vi.fn(() => false),
    handlers,
    webContentsHandlers,
  };
};

const createStore = (initial = {}) => {
  const values = { ...initial };
  return {
    get: vi.fn((key) => values[key]),
    set: vi.fn((key, value) => {
      values[key] = value;
    }),
  };
};

const createApp = () => {
  const handlers = {};
  return {
    quit: vi.fn(),
    dock: { show: vi.fn() },
    handlers,
    on: vi.fn((event, callback) => {
      handlers[event] = callback;
    }),
    whenReady: vi.fn(() => Promise.resolve()),
  };
};

const buildIpcHarness = (overrides = {}) => {
  const handlers = {};
  const store = createStore();
  const app = createApp();
  const BrowserWindow = { fromWebContents: vi.fn(() => null) };

  registerIpcHandlers({
    app,
    ipcMain: {
      handle: vi.fn((channel, callback) => {
        handlers[channel] = callback;
      }),
    },
    BrowserWindow,
    store,
    randomUUID: vi.fn(() => "uuid-generated"),
    zoomStateByWebContentsId: new Map(),
    zoomWindowsWithListeners: new WeakSet(),
    ...overrides,
  });

  return { handlers, store, app, BrowserWindow };
};

describe("electron mainProcess", () => {
  afterEach(() => {
    setPlatform(originalPlatform);
    vi.restoreAllMocks();
  });

  describe("getOrCreateDeviceCode", () => {
    it("devuelve el codigo existente sin generar ni guardar", () => {
      const store = createStore({ device_code: "device-existing" });
      const randomUUID = vi.fn();

      expect(getOrCreateDeviceCode(store, randomUUID)).toBe("device-existing");
      expect(randomUUID).not.toHaveBeenCalled();
      expect(store.set).not.toHaveBeenCalled();
    });

    it("genera y persiste un codigo cuando no existe", () => {
      const store = createStore();
      const randomUUID = vi.fn(() => "device-new");

      expect(getOrCreateDeviceCode(store, randomUUID)).toBe("device-new");
      expect(store.set).toHaveBeenCalledWith("device_code", "device-new");
    });
  });

  describe("applyZoomForWebContents", () => {
    const run = (webContents, state, win) =>
      applyZoomForWebContents({
        webContents,
        zoomStateByWebContentsId: state,
        BrowserWindow: { fromWebContents: vi.fn(() => win) },
      });

    it("no hace nada si el webContents no existe o esta destruido", () => {
      const state = new Map();
      expect(() => run(null, state, null)).not.toThrow();

      const destroyed = createWebContents({ isDestroyed: vi.fn(() => true) });
      run(destroyed, state, createFakeWindow());
      expect(destroyed.setZoomFactor).not.toHaveBeenCalled();
    });

    it("no hace nada si no hay estado de zoom", () => {
      const webContents = createWebContents();
      run(webContents, new Map(), createFakeWindow());
      expect(webContents.setZoomFactor).not.toHaveBeenCalled();
    });

    it("no hace nada si la ventana esta destruida", () => {
      const webContents = createWebContents();
      const win = createFakeWindow();
      win.isDestroyed = vi.fn(() => true);
      const state = new Map([
        [webContents.id, { baseWidth: 400, baseHeight: 300 }],
      ]);

      run(webContents, state, win);
      expect(webContents.setZoomFactor).not.toHaveBeenCalled();
    });

    it("calcula el menor factor de escala y lo aplica", () => {
      const webContents = createWebContents();
      const win = createFakeWindow();
      win.getContentBounds = vi.fn(() => ({ width: 800, height: 600 }));
      const state = new Map([
        [
          webContents.id,
          { baseWidth: 400, baseHeight: 300, minZoom: 0.5, maxZoom: 3 },
        ],
      ]);

      run(webContents, state, win);

      expect(webContents.setZoomFactor).toHaveBeenCalledWith(2);
      expect(state.get(webContents.id).lastZoom).toBe(2);
    });

    it("respeta el maximo configurado", () => {
      const webContents = createWebContents();
      const win = createFakeWindow();
      win.getContentBounds = vi.fn(() => ({ width: 800, height: 600 }));
      const state = new Map([
        [
          webContents.id,
          { baseWidth: 100, baseHeight: 100, minZoom: 0.5, maxZoom: 3 },
        ],
      ]);

      run(webContents, state, win);

      expect(webContents.setZoomFactor).toHaveBeenCalledWith(3);
    });

    it("respeta el minimo configurado", () => {
      const webContents = createWebContents();
      const win = createFakeWindow();
      win.getContentBounds = vi.fn(() => ({ width: 100, height: 100 }));
      const state = new Map([
        [
          webContents.id,
          { baseWidth: 1000, baseHeight: 1000, minZoom: 0.5, maxZoom: 3 },
        ],
      ]);

      run(webContents, state, win);

      expect(webContents.setZoomFactor).toHaveBeenCalledWith(0.5);
    });

    it("usa defaults cuando min/max no son finitos", () => {
      const webContents = createWebContents();
      const win = createFakeWindow();
      win.getContentBounds = vi.fn(() => ({ width: 800, height: 600 }));
      const state = new Map([
        [webContents.id, { baseWidth: 100, baseHeight: 100 }],
      ]);

      run(webContents, state, win);

      expect(webContents.setZoomFactor).toHaveBeenCalledWith(3);
    });

    it("no reaplica si el cambio es menor al epsilon", () => {
      const webContents = createWebContents();
      const win = createFakeWindow();
      win.getContentBounds = vi.fn(() => ({ width: 800, height: 600 }));
      const state = new Map([
        [
          webContents.id,
          {
            baseWidth: 400,
            baseHeight: 300,
            minZoom: 0.5,
            maxZoom: 3,
            lastZoom: 2,
          },
        ],
      ]);

      run(webContents, state, win);

      expect(webContents.setZoomFactor).not.toHaveBeenCalled();
    });
  });

  describe("registerIpcHandlers", () => {
    it("registra los seis canales esperados", () => {
      const { handlers } = buildIpcHarness();

      expect(Object.keys(handlers).sort()).toEqual([...IPC_CHANNELS].sort());
    });

    it("get-device-code responde con el codigo del dispositivo", async () => {
      const { handlers } = buildIpcHarness();

      await expect(handlers["get-device-code"]()).resolves.toEqual({
        deviceCode: "uuid-generated",
      });
    });

    it("close-app cierra la aplicacion", async () => {
      const quit = vi.fn();
      const { handlers } = buildIpcHarness({ app: { ...createApp(), quit } });

      await expect(handlers["close-app"]()).resolves.toEqual({ success: true });
      expect(quit).toHaveBeenCalled();
    });

    it("set-zoom-factor aplica el factor y cae a 1 si no es numerico", async () => {
      const { handlers } = buildIpcHarness();
      const webContents = createWebContents();

      await expect(
        handlers["set-zoom-factor"]({ sender: webContents }, "1.5")
      ).resolves.toEqual({ success: true });
      expect(webContents.setZoomFactor).toHaveBeenCalledWith(1.5);

      await handlers["set-zoom-factor"]({ sender: webContents }, "no-numero");
      expect(webContents.setZoomFactor).toHaveBeenLastCalledWith(1);
    });

    it("configure-zoom rechaza una base invalida sin guardar estado", async () => {
      const zoomState = new Map();
      const { handlers } = buildIpcHarness({
        zoomStateByWebContentsId: zoomState,
      });
      const webContents = createWebContents();

      await expect(
        handlers["configure-zoom"](
          { sender: webContents },
          { baseWidth: "x", baseHeight: 0 }
        )
      ).resolves.toEqual({ success: false, message: "Base inválida" });
      expect(zoomState.size).toBe(0);
    });

    it("configure-zoom guarda la base, suscribe la ventana una sola vez y aplica zoom", async () => {
      const zoomState = new Map();
      const listeners = new WeakSet();
      const webContents = createWebContents({ id: 42 });
      const win = createFakeWindow(webContents);
      const BrowserWindow = { fromWebContents: vi.fn(() => win) };
      const { handlers } = buildIpcHarness({
        BrowserWindow,
        zoomStateByWebContentsId: zoomState,
        zoomWindowsWithListeners: listeners,
      });

      await expect(
        handlers["configure-zoom"](
          { sender: webContents },
          { baseWidth: 400, baseHeight: 300, minZoom: 0.5, maxZoom: 3 }
        )
      ).resolves.toEqual({ success: true });

      expect(zoomState.get(42)).toMatchObject({
        baseWidth: 400,
        baseHeight: 300,
      });
      expect(win.on).toHaveBeenCalledTimes(3);
      expect(webContents.setZoomFactor).toHaveBeenCalledWith(2);

      await handlers["configure-zoom"](
        { sender: webContents },
        { baseWidth: 400, baseHeight: 300 }
      );
      expect(win.on).toHaveBeenCalledTimes(3);
    });

    it("reset-zoom limpia el estado y restaura el factor", async () => {
      const zoomState = new Map([[7, { baseWidth: 400, baseHeight: 300 }]]);
      const { handlers } = buildIpcHarness({
        zoomStateByWebContentsId: zoomState,
      });
      const webContents = createWebContents({ id: 7 });

      await expect(
        handlers["reset-zoom"]({ sender: webContents })
      ).resolves.toEqual({ success: true });

      expect(zoomState.has(7)).toBe(false);
      expect(webContents.setZoomFactor).toHaveBeenCalledWith(1);
    });

    it("get-zoom-debug reporta factor, bounds y estado", async () => {
      const zoomState = new Map([[7, { baseWidth: 400, baseHeight: 300 }]]);
      const webContents = createWebContents({
        id: 7,
        getZoomFactor: vi.fn(() => 1.25),
      });
      const win = createFakeWindow(webContents);
      const { handlers } = buildIpcHarness({
        BrowserWindow: { fromWebContents: vi.fn(() => win) },
        zoomStateByWebContentsId: zoomState,
      });

      await expect(
        handlers["get-zoom-debug"]({ sender: webContents })
      ).resolves.toEqual({
        zoomFactor: 1.25,
        contentBounds: { width: 800, height: 600 },
        state: { baseWidth: 400, baseHeight: 300 },
      });
    });

    it("get-zoom-debug tolera un webContents destruido", async () => {
      const webContents = createWebContents({
        isDestroyed: vi.fn(() => true),
      });
      const { handlers } = buildIpcHarness();

      await expect(
        handlers["get-zoom-debug"]({ sender: webContents })
      ).resolves.toEqual({
        zoomFactor: null,
        contentBounds: null,
        state: null,
      });
    });
  });

  describe("createMainWindow", () => {
    const buildWindow = (isDev) => {
      const fakeWindow = createFakeWindow();
      const BrowserWindow = vi.fn(function BrowserWindowMock() {
        return fakeWindow;
      });
      const windowState = { mainWindow: null };
      const app = createApp();

      const win = createMainWindow({
        BrowserWindow,
        app,
        isDev,
        path,
        dirname: "/app/electron",
        windowState,
      });

      return { BrowserWindow, app, fakeWindow, win, windowState };
    };

    it("crea la ventana con hardening y la oculta hasta estar lista", () => {
      const { BrowserWindow, fakeWindow } = buildWindow(false);

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: path.join("/app/electron", "../icon.ico"),
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            preload: path.join("/app/electron", "preload.js"),
          },
        })
      );
      expect(fakeWindow.loadURL).not.toHaveBeenCalledWith(
        "http://localhost:5173"
      );
    });

    it("carga la URL de desarrollo y abre DevTools en dev", () => {
      const { fakeWindow, win } = buildWindow(true);

      expect(fakeWindow.loadURL).toHaveBeenCalledWith("http://localhost:5173");
      expect(fakeWindow.webContents.openDevTools).toHaveBeenCalledWith({
        mode: "detach",
      });
      expect(win).toBe(fakeWindow);
    });

    it("carga el index empaquetado en produccion", () => {
      const { fakeWindow } = buildWindow(false);

      expect(fakeWindow.loadURL).toHaveBeenCalledWith(
        `file://${path.join("/app/electron", "../dist/index.html")}`
      );
    });

    it("bloquea ventanas emergentes", () => {
      const { fakeWindow } = buildWindow(false);
      const handler =
        fakeWindow.webContents.setWindowOpenHandler.mock.calls[0][0];

      expect(handler()).toEqual({ action: "deny" });
    });

    it("bloquea navegacion a un origen externo y permite el propio", () => {
      const { fakeWindow } = buildWindow(true);
      const handler = fakeWindow.webContentsHandlers["will-navigate"];

      const externalEvent = { preventDefault: vi.fn() };
      handler(externalEvent, "https://evil.example.com");
      expect(externalEvent.preventDefault).toHaveBeenCalled();

      const sameOriginEvent = { preventDefault: vi.fn() };
      handler(sameOriginEvent, "http://localhost:5173/cualquier-ruta");
      expect(sameOriginEvent.preventDefault).not.toHaveBeenCalled();

      const invalidEvent = { preventDefault: vi.fn() };
      handler(invalidEvent, "no-es-url");
      expect(invalidEvent.preventDefault).toHaveBeenCalled();
    });

    it("muestra la ventana a pantalla completa al estar lista", () => {
      setPlatform("darwin");
      const { fakeWindow, app } = buildWindow(false);

      fakeWindow.handlers["ready-to-show"]();

      expect(fakeWindow.show).toHaveBeenCalled();
      expect(fakeWindow.setFullScreen).toHaveBeenCalledWith(true);
      expect(app.dock.show).toHaveBeenCalled();
    });

    it("no toca el dock fuera de macOS", () => {
      setPlatform("linux");
      const { fakeWindow, app } = buildWindow(false);

      fakeWindow.handlers["ready-to-show"]();

      expect(fakeWindow.show).toHaveBeenCalled();
      expect(app.dock.show).not.toHaveBeenCalled();
    });

    it("limpia la referencia al cerrar la ventana", () => {
      const { fakeWindow, windowState } = buildWindow(false);
      expect(windowState.mainWindow).toBe(fakeWindow);

      fakeWindow.handlers["closed"]();

      expect(windowState.mainWindow).toBeNull();
    });
  });

  describe("registerAppLifecycle", () => {
    it("cierra la app al cerrar todas las ventanas fuera de macOS", () => {
      setPlatform("linux");
      const app = createApp();
      const BrowserWindow = { getAllWindows: vi.fn(() => []) };

      registerAppLifecycle({ app, BrowserWindow, createWindow: vi.fn() });
      app.handlers["window-all-closed"]();

      expect(app.quit).toHaveBeenCalled();
    });

    it("mantiene la app viva en macOS al cerrar ventanas", () => {
      setPlatform("darwin");
      const app = createApp();
      const BrowserWindow = { getAllWindows: vi.fn(() => []) };

      registerAppLifecycle({ app, BrowserWindow, createWindow: vi.fn() });
      app.handlers["window-all-closed"]();

      expect(app.quit).not.toHaveBeenCalled();
    });

    it("recrea la ventana en activate solo si no hay ventanas", () => {
      const app = createApp();
      const createWindow = vi.fn();
      const BrowserWindow = { getAllWindows: vi.fn(() => []) };

      registerAppLifecycle({ app, BrowserWindow, createWindow });
      app.handlers["activate"]();
      expect(createWindow).toHaveBeenCalledTimes(1);

      BrowserWindow.getAllWindows.mockReturnValue([{}]);
      app.handlers["activate"]();
      expect(createWindow).toHaveBeenCalledTimes(1);
    });

    it("crea la ventana cuando Electron esta listo", async () => {
      const app = createApp();
      const createWindow = vi.fn();

      registerAppLifecycle({
        app,
        BrowserWindow: { getAllWindows: vi.fn(() => []) },
        createWindow,
      });
      await Promise.resolve();

      expect(app.whenReady).toHaveBeenCalled();
      expect(createWindow).toHaveBeenCalledTimes(1);
    });
  });
});
