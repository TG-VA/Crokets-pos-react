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

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock("../../../../contexts/AuthContext", () => ({ useAuth }));

const { checkUserIsAdmin } = vi.hoisted(() => ({ checkUserIsAdmin: vi.fn() }));
vi.mock("../../../../lib/permissionsService", () => ({ checkUserIsAdmin }));

const { fetchActiveCashSession } = vi.hoisted(() => ({
  fetchActiveCashSession: vi.fn(),
}));
vi.mock("../../../../services/cashRegisterService", () => ({
  fetchActiveCashSession,
}));

const { runDiagnostics, checkOnlineStatus, checkElectronBridge } = vi.hoisted(
  () => ({
    runDiagnostics: vi.fn(),
    checkOnlineStatus: vi.fn(),
    checkElectronBridge: vi.fn(),
  })
);
vi.mock("./services/terminalDiagnosticsService", () => ({
  runDiagnostics,
  checkOnlineStatus,
  checkElectronBridge,
}));

const { fetchBranchProfile, updateBranchContact } = vi.hoisted(() => ({
  fetchBranchProfile: vi.fn(),
  updateBranchContact: vi.fn(),
}));
vi.mock("./services/branchProfileService", () => ({
  fetchBranchProfile,
  updateBranchContact,
}));

describe("SettingsTerminal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBranch.mockReturnValue({
      branch: { id: "b1", code: "MID", name: "Mérida" },
      setBranch: vi.fn(),
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
    useAuth.mockReturnValue({ user: { id: "u1" } });
    checkUserIsAdmin.mockResolvedValue(false);
    fetchActiveCashSession.mockResolvedValue({ success: true, data: null });
    runDiagnostics.mockResolvedValue({
      success: true,
      overallOk: true,
      online: true,
      latencyMs: 50,
      services: [],
    });
    checkOnlineStatus.mockReturnValue(true);
    checkElectronBridge.mockReturnValue(false);
    fetchBranchProfile.mockResolvedValue({
      success: true,
      data: { id: "b1", code: "MID", name: "Mérida" },
    });
    updateBranchContact.mockResolvedValue({ success: true, data: {} });
  });

  it("muestra el código del dispositivo, la sucursal y el estado de conexión", async () => {
    render(<SettingsTerminal />);

    expect(await screen.findByText("pos-01")).toBeTruthy();
    expect(screen.getByText("MID")).toBeTruthy();
    expect(screen.getByText("Mérida")).toBeTruthy();
    expect(await screen.findByText("Conectado a Supabase")).toBeTruthy();
  });

  it("reporta desconexión con Supabase", async () => {
    checkSupabaseConnection.mockResolvedValue({
      success: false,
      connected: false,
      error: "timeout",
    });
    runDiagnostics.mockResolvedValue({
      success: true,
      overallOk: false,
      online: false,
      latencyMs: null,
      services: [],
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

    runDiagnostics.mockClear();
    runDiagnostics.mockResolvedValue({
      success: true,
      overallOk: true,
      online: true,
      latencyMs: 50,
      services: [],
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Ejecutar diagnóstico" })
    );

    await waitFor(() => {
      expect(runDiagnostics).toHaveBeenCalled();
    });
  });

  it("muestra los distintivos de alcance de sucursal, equipo y estado", async () => {
    render(<SettingsTerminal />);

    const branchBadges = await screen.findAllByText(/Aplica a nivel global/i);
    expect(branchBadges).toHaveLength(1);
    expect(screen.getAllByText(/Solo este equipo/i)).toHaveLength(3);
    expect(screen.getByText(/Estado del sistema/i)).toBeTruthy();
  });

  it("renderiza la tarjeta del lector de código de barras y su probador interactivo", async () => {
    render(<SettingsTerminal />);

    expect(
      await screen.findByRole("heading", { name: "Lector de código de barras" })
    ).toBeTruthy();
    expect(screen.getByLabelText("Prueba interactiva de lectura")).toBeTruthy();
  });
});
