import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import styles from "./Navbar.module.css";

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", username: "cajero" },
    lockScreen: vi.fn(),
  }),
}));

vi.mock("../../contexts/BranchContext", () => ({
  useBranch: () => ({
    branch: { id: "branch-1", code: "01", name: "Centro" },
  }),
}));

vi.mock("../../lib/permissionsService", () => ({
  checkUserIsAdmin: vi.fn(),
}));

vi.mock("./hooks/useKeyboardShortcuts", () => ({
  useKeyboardShortcuts: () => {},
}));

import { checkUserIsAdmin } from "../../lib/permissionsService";
import Navbar from "./Navbar";

const LocationDisplay = () => {
  const location = useLocation();

  return <div data-testid="location">{location.pathname}</div>;
};

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
      <LocationDisplay />
    </MemoryRouter>
  );

const settingsButton = () =>
  screen.getByRole("button", { name: /Configuración/ });

describe("Navbar: estado activo de Configuracion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkUserIsAdmin.mockResolvedValue(true);
  });

  it("resalta Configuracion en /settings y sus subrutas", () => {
    renderAt("/settings/usuarios");

    expect(settingsButton().className).toContain(styles.active);
  });

  it("resalta Configuracion en la ruta legada /profiles", () => {
    renderAt("/profiles");

    expect(settingsButton().className).toContain(styles.active);
  });

  it("no resalta Configuracion fuera de las rutas de configuracion", () => {
    renderAt("/dashboard");

    expect(settingsButton().className).not.toContain(styles.active);
  });
});

describe("Navbar: autorizacion de Configuracion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navega directo a Configuracion si el usuario es administrador", async () => {
    checkUserIsAdmin.mockResolvedValue(true);

    renderAt("/dashboard");

    fireEvent.click(settingsButton());

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe("/settings");
    });
    expect(checkUserIsAdmin).toHaveBeenCalledWith("user-1");
  });

  it("mantiene la pantalla actual y abre el modal si no es administrador", async () => {
    checkUserIsAdmin.mockResolvedValue(false);

    renderAt("/dashboard");

    fireEvent.click(settingsButton());

    expect(
      await screen.findByRole("heading", { name: "Acceso restringido" })
    ).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe("/dashboard");
  });
});
