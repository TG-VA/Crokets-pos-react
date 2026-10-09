import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock("../../../../contexts/AuthContext", () => ({ useAuth }));

describe("SettingsCash", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: "user-1" } });
  });

  it("carga y muestra el tope de apertura para administradores", async () => {
    checkUserIsAdmin.mockResolvedValue(true);
    getCashMaxOpeningAmount.mockResolvedValue({
      success: true,
      amount: 5000,
      error: null,
    });

    render(<SettingsCash />);

    const input = await screen.findByLabelText("Monto máximo");
    expect(input.value).toBe("5000");
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
    fireEvent.change(input, { target: { value: "2500" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar/i }));

    const status = await screen.findByRole("status");
    expect(status.textContent).toContain(
      "Tope de apertura de caja actualizado."
    );
    expect(updateCashMaxOpeningAmount).toHaveBeenCalledWith("2500");
    expect(input.value).toBe("2500");
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
    fireEvent.click(screen.getByRole("button", { name: /Guardar/i }));

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
        "Se requiere un perfil de administrador para modificar este valor."
      )
    ).toBeTruthy();
    expect(screen.queryByLabelText("Monto máximo")).toBeNull();
    expect(getCashMaxOpeningAmount).not.toHaveBeenCalled();
  });
});
