import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import SettingsCash from "./SettingsCash";

const { checkUserIsAdmin } = vi.hoisted(() => ({
  checkUserIsAdmin: vi.fn(),
}));

vi.mock("../../../../lib/permissionsService", () => ({ checkUserIsAdmin }));

const { getCashMaxOpeningAmount, updateCashMaxOpeningAmount } = vi.hoisted(
  () => ({
    getCashMaxOpeningAmount: vi.fn(),
    updateCashMaxOpeningAmount: vi.fn(),
  })
);

vi.mock("../../../../pages/Settings/services/cashSettingsService", () => ({
  getCashMaxOpeningAmount,
  updateCashMaxOpeningAmount,
}));

const {
  getCashOperationSettings,
  loadCashOperationSettings,
  persistCashOperationSettings,
  triggerCashDrawerKick,
} = vi.hoisted(() => ({
  getCashOperationSettings: vi.fn(),
  loadCashOperationSettings: vi.fn(),
  persistCashOperationSettings: vi.fn(),
  triggerCashDrawerKick: vi.fn(),
}));

vi.mock("../../../../services/cashOperationSettingsService", () => ({
  getCashOperationSettings,
  loadCashOperationSettings,
  persistCashOperationSettings,
  triggerCashDrawerKick,
}));

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock("../../../../contexts/AuthContext", () => ({ useAuth }));

const { useBranch } = vi.hoisted(() => ({ useBranch: vi.fn() }));

vi.mock("../../../../contexts/BranchContext", () => ({ useBranch }));

const baseSettings = {
  defaultOpeningCash: 0,
  allowZeroOpening: true,
  maxOpeningCashEnabled: true,
  minOpeningCashEnabled: false,
  minOpeningCash: 0,
  drawerCashLimit: 0,
  drawerAlertEnabled: false,
  requireExitReason: true,
  blindCountCut: false,
  requireCutDifferenceNote: true,
  cashDrawerEnabled: false,
  cashDrawerTrigger: "cash_only",
  cashDrawerConnection: "printer_rj11",
  acceptUsdPayments: true,
  defaultExchangeRate: 18.5,
};

describe("SettingsCash", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    useBranch.mockReturnValue({ branch: { id: "branch-1" } });
    getCashOperationSettings.mockReturnValue({
      success: true,
      ...baseSettings,
    });
    loadCashOperationSettings.mockResolvedValue({
      success: true,
      ...baseSettings,
      error: null,
      source: "cache",
    });
    persistCashOperationSettings.mockResolvedValue({
      success: true,
      partial: false,
      synced: true,
      ...baseSettings,
      error: null,
    });
  });

  it("hidrata la configuracion desde la sucursal activa", async () => {
    checkUserIsAdmin.mockResolvedValue(true);
    getCashMaxOpeningAmount.mockResolvedValue({
      success: true,
      amount: 5000,
      error: null,
    });
    loadCashOperationSettings.mockResolvedValue({
      success: true,
      ...baseSettings,
      defaultOpeningCash: 320,
      error: null,
      source: "remote",
    });

    render(<SettingsCash />);

    const input = await screen.findByLabelText("Monto máximo");
    expect(input.value).toBe("5000");
    expect(loadCashOperationSettings).toHaveBeenCalledWith({
      branchId: "branch-1",
    });
    await screen.findByDisplayValue("320");
    expect(document.getElementById("default-opening-cash").value).toBe("320");
  });

  it("guarda el tope y anuncia el éxito con role=status", async () => {
    checkUserIsAdmin.mockResolvedValue(true);
    getCashMaxOpeningAmount.mockResolvedValue({
      success: true,
      amount: 1000,
      error: null,
    });
    updateCashMaxOpeningAmount.mockResolvedValue({
      success: true,
      amount: 2500,
      error: null,
    });

    render(<SettingsCash />);

    const input = await screen.findByLabelText("Monto máximo");
    const saveButton = screen.getByRole("button", { name: /Guardar/i });
    await waitFor(() => expect(saveButton.disabled).toBe(false));
    fireEvent.change(input, { target: { value: "2500" } });
    fireEvent.click(saveButton);

    const status = await screen.findByRole("status");
    expect(status.textContent).toContain(
      "Tope de apertura de caja actualizado."
    );
    expect(updateCashMaxOpeningAmount).toHaveBeenCalledWith("2500");
    expect(input.value).toBe("2500");
    expect(persistCashOperationSettings).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: "branch-1" })
    );
  });

  it("anuncia el error del servicio con role=alert", async () => {
    checkUserIsAdmin.mockResolvedValue(true);
    getCashMaxOpeningAmount.mockResolvedValue({
      success: true,
      amount: 1000,
      error: null,
    });
    updateCashMaxOpeningAmount.mockResolvedValue({
      success: false,
      amount: null,
      error: "No se pudo actualizar el tope de apertura.",
    });

    render(<SettingsCash />);

    await screen.findByLabelText("Monto máximo");
    const saveButton = screen.getByRole("button", { name: /Guardar/i });
    await waitFor(() => expect(saveButton.disabled).toBe(false));
    fireEvent.click(saveButton);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "No se pudo actualizar el tope de apertura."
    );
  });

  it("oculta el formulario cuando el usuario no es administrador", async () => {
    checkUserIsAdmin.mockResolvedValue(false);

    render(<SettingsCash />);

    expect(
      await screen.findByText(
        "Se requiere un perfil de administrador para modificar el tope de apertura."
      )
    ).toBeTruthy();
    expect(screen.queryByLabelText("Monto máximo")).toBeNull();
    expect(getCashMaxOpeningAmount).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Guardar/i }).disabled).toBe(
      true
    );
  });

  it("bloquea el botón de prueba de cajón durante el cooldown", async () => {
    checkUserIsAdmin.mockResolvedValue(false);
    triggerCashDrawerKick.mockResolvedValue({
      success: true,
      message: "Pulso de apertura enviado al cajón de dinero.",
    });
    getCashOperationSettings.mockReturnValue({
      success: true,
      ...baseSettings,
      cashDrawerEnabled: true,
    });
    loadCashOperationSettings.mockResolvedValue({
      success: true,
      ...baseSettings,
      cashDrawerEnabled: true,
      error: null,
      source: "cache",
    });

    render(<SettingsCash />);

    const button = await screen.findByRole("button", {
      name: "Probar apertura del cajón",
    });
    expect(button.disabled).toBe(false);

    vi.useFakeTimers();
    try {
      await act(async () => {
        fireEvent.click(button);
      });

      expect(triggerCashDrawerKick).toHaveBeenCalledTimes(1);
      const testingButton = screen.getByRole("button", { name: "Probando..." });
      expect(testingButton.disabled).toBe(true);

      await act(async () => {
        fireEvent.click(testingButton);
      });
      expect(triggerCashDrawerKick).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(2500);
      });

      expect(
        screen.getByRole("button", { name: "Probar apertura del cajón" })
          .disabled
      ).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("muestra el distintivo de alcance de sucursal en cada tarjeta", async () => {
    checkUserIsAdmin.mockResolvedValue(true);

    render(<SettingsCash />);

    const branchBadges = await screen.findAllByText(/Aplica a nivel global/i);
    expect(branchBadges).toHaveLength(5);
    expect(screen.queryByText(/Solo este equipo/i)).toBeNull();
  });
});
