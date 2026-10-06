import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "../lib/supabaseClient";
import {
  clampZoomFactor,
  fetchDeviceCode,
  checkSupabaseConnection,
  applyZoomFactor,
  resetZoom,
} from "./terminalSettingsService";

vi.mock("../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

const removeElectronBridge = () => {
  delete window.electronAPI;
};

describe("terminalSettingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    removeElectronBridge();
  });

  it("acota el factor de zoom dentro de los límites soportados", () => {
    expect(clampZoomFactor(0.1)).toBe(0.5);
    expect(clampZoomFactor(5)).toBe(2);
    expect(clampZoomFactor(1.234)).toBe(1.23);
    expect(clampZoomFactor("abc")).toBe(1);
  });

  it("reporta que el código del dispositivo no existe fuera de Electron", async () => {
    const result = await fetchDeviceCode();

    expect(result.success).toBe(false);
    expect(result.deviceCode).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("lee el código del dispositivo a través del puente de Electron", async () => {
    window.electronAPI = {
      invoke: vi.fn().mockResolvedValue({ deviceCode: "pos-01" }),
    };

    const result = await fetchDeviceCode();

    expect(window.electronAPI.invoke).toHaveBeenCalledWith("get-device-code");
    expect(result).toEqual({
      success: true,
      deviceCode: "pos-01",
      error: null,
    });
  });

  it("verifica la conexión con Supabase con una consulta ligera", async () => {
    const limit = vi
      .fn()
      .mockResolvedValue({ data: [{ id: "1" }], error: null });
    const select = vi.fn().mockReturnValue({ limit });
    supabase.from.mockReturnValue({ select });

    const result = await checkSupabaseConnection();

    expect(supabase.from).toHaveBeenCalledWith("users");
    expect(result).toEqual({ success: true, connected: true, error: null });
  });

  it("reporta desconexión cuando la consulta a Supabase falla", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const limit = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "timeout" } });
    const select = vi.fn().mockReturnValue({ limit });
    supabase.from.mockReturnValue({ select });

    const result = await checkSupabaseConnection();

    expect(result.success).toBe(false);
    expect(result.connected).toBe(false);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("aplica el factor de zoom redondeado a dos decimales", async () => {
    window.electronAPI = {
      invoke: vi.fn().mockResolvedValue({ success: true }),
    };

    const result = await applyZoomFactor(1.1119);

    expect(window.electronAPI.invoke).toHaveBeenCalledWith(
      "set-zoom-factor",
      1.11
    );
    expect(result).toEqual({
      success: true,
      zoomFactor: 1.11,
      error: null,
    });
  });

  it("restablece el zoom a 100%", async () => {
    window.electronAPI = {
      invoke: vi.fn().mockResolvedValue({ success: true }),
    };

    const result = await resetZoom();

    expect(window.electronAPI.invoke).toHaveBeenCalledWith("reset-zoom");
    expect(result).toEqual({ success: true, zoomFactor: 1, error: null });
  });
});
