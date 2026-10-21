import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../../services/deviceBranchService", () => ({
  fetchActiveBranches: vi.fn(),
  registerPosDevice: vi.fn(),
}));

import {
  fetchActiveBranches,
  registerPosDevice,
} from "../../services/deviceBranchService";
import DeviceActivationModal from "./DeviceActivationModal";

const branches = [
  { id: "b1", name: "Centro", code: "C01", city: "Cancún", state: "QR" },
  { id: "b2", name: "Norte", code: "C02", city: "Cancún", state: "QR" },
];

const renderModal = (props = {}) =>
  render(
    <DeviceActivationModal
      isOpen
      deviceCode="device-uuid"
      onClose={vi.fn()}
      onActivated={vi.fn()}
      {...props}
    />
  );

describe("DeviceActivationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchActiveBranches.mockResolvedValue({
      success: true,
      data: branches,
      error: null,
    });
    registerPosDevice.mockResolvedValue({
      success: true,
      branch: { id: "b1", name: "Centro", code: "C01" },
    });
  });

  it("no renderiza nada cuando esta cerrado", () => {
    renderModal({ isOpen: false });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetchActiveBranches).not.toHaveBeenCalled();
  });

  it("muestra el codigo del dispositivo detectado", () => {
    renderModal();

    expect(screen.getByText("device-uuid")).toBeTruthy();
  });

  it("carga y lista las sucursales activas en el selector", async () => {
    renderModal();

    expect(await screen.findByRole("option", { name: "Centro" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Norte" })).toBeTruthy();
    expect(fetchActiveBranches).toHaveBeenCalledTimes(1);

    const select = screen.getByLabelText("Sucursal");
    expect(select.value).toBe("b1");
  });

  it("muestra un banner cuando falla la carga de sucursales", async () => {
    fetchActiveBranches.mockResolvedValue({
      success: false,
      data: [],
      error: "permission denied",
    });

    renderModal();

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "permission denied"
    );
  });

  it("exige el usuario del administrador", async () => {
    renderModal();
    await screen.findByRole("option", { name: "Centro" });

    fireEvent.click(
      screen.getByRole("button", { name: "Vincular y Activar Equipo" })
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Ingresa el usuario administrador."
    );
    expect(registerPosDevice).not.toHaveBeenCalled();
  });

  it("exige la contraseña del administrador", async () => {
    renderModal();
    await screen.findByRole("option", { name: "Centro" });

    fireEvent.change(screen.getByLabelText("Usuario Administrador"), {
      target: { value: "admin" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Vincular y Activar Equipo" })
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Ingresa la contraseña del administrador."
    );
    expect(registerPosDevice).not.toHaveBeenCalled();
  });

  it("vincula el equipo y muestra la confirmacion de exito", async () => {
    const onActivated = vi.fn();
    renderModal({ onActivated });
    await screen.findByRole("option", { name: "Centro" });

    fireEvent.change(screen.getByLabelText("Usuario Administrador"), {
      target: { value: "  admin  " },
    });
    fireEvent.change(screen.getByLabelText("Contraseña Administrador"), {
      target: { value: "secreto" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Vincular y Activar Equipo" })
    );

    await waitFor(() => {
      expect(registerPosDevice).toHaveBeenCalledWith({
        deviceCode: "device-uuid",
        branchId: "b1",
        username: "admin",
        password: "secreto",
      });
    });

    expect(await screen.findByText("Equipo vinculado")).toBeTruthy();
    expect(screen.getByText(/quedó asignado a Centro/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(onActivated).toHaveBeenCalledWith({
      id: "b1",
      name: "Centro",
      code: "C01",
    });
  });

  it("muestra el error cuando la vinculacion falla", async () => {
    registerPosDevice.mockResolvedValue({
      success: false,
      error: "Usuario administrador o contraseña incorrectos.",
    });

    const onActivated = vi.fn();
    renderModal({ onActivated });
    await screen.findByRole("option", { name: "Centro" });

    fireEvent.change(screen.getByLabelText("Usuario Administrador"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña Administrador"), {
      target: { value: "malo" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Vincular y Activar Equipo" })
    );

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "Usuario administrador o contraseña incorrectos."
    );
    expect(screen.queryByText("Equipo vinculado")).toBeNull();
    expect(onActivated).not.toHaveBeenCalled();
  });

  it("cierra el modal al pulsar la tecla Escape", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await screen.findByRole("option", { name: "Centro" });

    await waitFor(() => {
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("cierra el modal con el boton de cierre", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await screen.findByRole("option", { name: "Centro" });

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
