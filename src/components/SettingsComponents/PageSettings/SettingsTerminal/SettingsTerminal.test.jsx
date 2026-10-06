import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsTerminal from "./SettingsTerminal";

const {
  fetchDeviceCode,
  checkSupabaseConnection,
  readZoomFactor,
  applyZoomFactor,
  resetZoom,
} = vi.hoisted(() => ({
  fetchDeviceCode: vi.fn(),
  checkSupabaseConnection: vi.fn(),
  readZoomFactor: vi.fn(),
  applyZoomFactor: vi.fn(),
  resetZoom: vi.fn(),
}));

vi.mock("../../../../services/terminalSettingsService", () => ({
  fetchDeviceCode,
  checkSupabaseConnection,
  readZoomFactor,
  applyZoomFactor,
  resetZoom,
}));

const { useBranch } = vi.hoisted(() => ({ useBranch: vi.fn() }));

vi.mock("../../../../contexts/BranchContext", () => ({ useBranch }));

describe("SettingsTerminal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBranch.mockReturnValue({
      branch: { id: "b1", code: "MID", name: "Mérida" },
    });
    fetchDeviceCode.mockResolvedValue({
      success: true,
      deviceCode: "pos-01",
      error: null,
    });
    checkSupabaseConnection.mockResolvedValue({
      success: true,
      connected: true,
      error: null,
    });
    readZoomFactor.mockResolvedValue({
      success: true,
      zoomFactor: 1,
      error: null,
    });
  });

  it("muestra el código del dispositivo, la sucursal y el estado de conexión", async () => {
    render(<SettingsTerminal />);

    expect(await screen.findByText("pos-01")).toBeTruthy();
    expect(screen.getByText("MID - Mérida")).toBeTruthy();
    expect(await screen.findByText("Conectado a Supabase")).toBeTruthy();
  });

  it("reporta desconexión con Supabase", async () => {
    checkSupabaseConnection.mockResolvedValue({
      success: false,
      connected: false,
      error: "timeout",
    });

    render(<SettingsTerminal />);

    expect(await screen.findByText("Sin conexión con Supabase")).toBeTruthy();
  });

  it("aplica el zoom y anuncia el nuevo porcentaje", async () => {
    applyZoomFactor.mockResolvedValue({
      success: true,
      zoomFactor: 1.1,
      error: null,
    });

    render(<SettingsTerminal />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Acercar vista" })
    );

    expect(applyZoomFactor).toHaveBeenCalledWith(1.1);

    await waitFor(() => {
      const status = screen.getAllByRole("status");
      expect(status.some((node) => node.textContent.includes("110%"))).toBe(
        true
      );
    });
    expect(screen.getByText("Zoom actual: 110%")).toBeTruthy();
  });

  it("restablece el zoom con el botón correspondiente", async () => {
    resetZoom.mockResolvedValue({ success: true, zoomFactor: 1, error: null });

    render(<SettingsTerminal />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Restablecer vista" })
    );

    expect(resetZoom).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText("Zoom de la ventana restablecido.")
    ).toBeTruthy();
  });

  it("revisa la conexión al pulsar el botón correspondiente", async () => {
    render(<SettingsTerminal />);

    await screen.findByText("Conectado a Supabase");

    checkSupabaseConnection.mockClear();
    checkSupabaseConnection.mockResolvedValue({
      success: true,
      connected: true,
      error: null,
    });

    fireEvent.click(screen.getByRole("button", { name: "Revisar conexión" }));

    await waitFor(() => {
      expect(checkSupabaseConnection).toHaveBeenCalledTimes(1);
    });
  });
});
