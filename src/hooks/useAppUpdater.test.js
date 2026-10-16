import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import useAppUpdater from "./useAppUpdater";

/*
  Contrato del estado de auto-actualizaciones: la version instalada se lee al
  montar, el reinicio solo se habilita cuando la descarga termino (downloaded),
  y fuera de Electron el hook no rompe el render.
*/

const createElectronApi = ({
  appVersion = "1.0.0",
  status = { available: false, downloaded: false, version: null },
  withListener = true,
} = {}) => {
  const listeners = new Map();

  const api = {
    invoke: vi.fn((channel) => {
      switch (channel) {
        case "get-app-version":
          return Promise.resolve(appVersion);
        case "get-update-status":
          return Promise.resolve(status);
        case "quit-and-install-update":
          return Promise.resolve({ success: true });
        default:
          return Promise.resolve(null);
      }
    }),
  };

  if (withListener) {
    api.on = vi.fn((channel, listener) => {
      listeners.set(channel, listener);
      return vi.fn(() => listeners.delete(channel));
    });
    api.emit = (channel, payload) => listeners.get(channel)?.(payload);
  }

  return api;
};

describe("useAppUpdater", () => {
  afterEach(() => {
    delete window.electronAPI;
    vi.clearAllMocks();
  });

  it("sin electronAPI mantiene el estado inicial y no falla", async () => {
    const { result } = renderHook(() => useAppUpdater());

    expect(result.current.appVersion).toBeNull();
    expect(result.current.updateReady).toBe(false);
    expect(result.current.newVersion).toBeNull();

    await act(async () => {
      const response = await result.current.installUpdate();
      expect(response.success).toBe(false);
    });
  });

  it("carga la version instalada y el estado inicial", async () => {
    window.electronAPI = createElectronApi();

    const { result } = renderHook(() => useAppUpdater());

    await waitFor(() => expect(result.current.appVersion).toBe("1.0.0"));
    expect(result.current.updateReady).toBe(false);
    expect(result.current.newVersion).toBeNull();
  });

  it("marca updateReady cuando el push reporta la descarga", async () => {
    const api = createElectronApi();
    window.electronAPI = api;

    const { result } = renderHook(() => useAppUpdater());

    await waitFor(() => expect(api.on).toHaveBeenCalled());

    act(() => {
      api.emit("update-status", {
        available: true,
        downloaded: true,
        version: "1.0.1",
      });
    });

    expect(result.current.updateReady).toBe(true);
    expect(result.current.newVersion).toBe("1.0.1");
  });

  it("un aviso disponible pero sin descargar no habilita el reinicio", async () => {
    const api = createElectronApi();
    window.electronAPI = api;

    const { result } = renderHook(() => useAppUpdater());

    await waitFor(() => expect(api.on).toHaveBeenCalled());

    act(() => {
      api.emit("update-status", {
        available: true,
        downloaded: false,
        version: "1.0.1",
      });
    });

    expect(result.current.updateReady).toBe(false);
    expect(result.current.newVersion).toBe("1.0.1");
  });

  it("installUpdate invoca el canal quit-and-install-update", async () => {
    const api = createElectronApi();
    window.electronAPI = api;

    const { result } = renderHook(() => useAppUpdater());

    await act(async () => {
      await result.current.installUpdate();
    });

    expect(api.invoke).toHaveBeenCalledWith("quit-and-install-update");
  });

  it("degrada a sondeo cuando el preload no expone listener", async () => {
    const api = createElectronApi({ withListener: false });
    window.electronAPI = api;

    renderHook(() => useAppUpdater({ statusPollIntervalMs: 20 }));

    await waitFor(() =>
      expect(
        api.invoke.mock.calls.filter(
          ([channel]) => channel === "get-update-status"
        ).length
      ).toBeGreaterThan(1)
    );
  });

  it("cancela la suscripcion al desmontar", async () => {
    const api = createElectronApi();
    window.electronAPI = api;

    const { unmount } = renderHook(() => useAppUpdater());

    await waitFor(() => expect(api.on).toHaveBeenCalled());
    const unsubscribe = api.on.mock.results[0].value;

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
