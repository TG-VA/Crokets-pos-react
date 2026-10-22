import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "branch-1" } }),
}));

vi.mock("../../lib/permissionsService", () => ({
  checkUserIsAdmin: vi.fn(),
}));

vi.mock("../../components/Navbar/Navbar", () => ({
  default: () => <div data-testid="global-navbar" />,
}));

vi.mock("../../components/Footer/Footer", () => ({
  default: () => <div data-testid="footer" />,
}));

vi.mock(
  "../../components/SettingsComponents/PageSettings/SettingsCash/SettingsCash",
  () => ({ default: () => <h1>Caja y Operación</h1> })
);

vi.mock(
  "../../components/SettingsComponents/PageSettings/SettingsUsers/SettingsUsers",
  () => ({ default: () => <h1>Usuarios y Permisos</h1> })
);

vi.mock(
  "../../components/SettingsComponents/PageSettings/SettingsPrinters/SettingsPrinters",
  () => ({ default: () => <h1>Impresión y Tickets</h1> })
);

vi.mock(
  "../../components/SettingsComponents/PageSettings/SettingsTerminal/SettingsTerminal",
  () => ({ default: () => <h1>Terminal y Sucursal</h1> })
);

vi.mock(
  "../../components/SettingsComponents/PageSettings/SettingsBranches/SettingsBranches",
  () => ({ default: () => <h1>Sucursales</h1> })
);

import { checkUserIsAdmin } from "../../lib/permissionsService";
import Settings from "./Settings";

const renderSettingsAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/settings/*" element={<Settings />} />
      </Routes>
    </MemoryRouter>
  );

describe("Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkUserIsAdmin.mockResolvedValue(true);
  });

  it("monta la sub-navbar y redirige /settings a la sección de caja", async () => {
    renderSettingsAt("/settings");

    const nav = await screen.findByRole("navigation", {
      name: "Submenú de configuración",
    });
    expect(nav).toBeTruthy();
    expect(
      await screen.findByRole("heading", { name: "Caja y Operación" })
    ).toBeTruthy();
    expect(screen.getByTestId("global-navbar")).toBeTruthy();
    expect(screen.getByTestId("footer")).toBeTruthy();
  });

  it("renderiza la subpágina de usuarios bajo /settings/usuarios", async () => {
    renderSettingsAt("/settings/usuarios");

    expect(
      await screen.findByRole("heading", { name: "Usuarios y Permisos" })
    ).toBeTruthy();
  });

  it("renderiza la subpágina de impresión bajo /settings/impresion", async () => {
    renderSettingsAt("/settings/impresion");

    expect(
      await screen.findByRole("heading", { name: "Impresión y Tickets" })
    ).toBeTruthy();
  });

  it("renderiza la subpágina de terminal bajo /settings/terminal", async () => {
    renderSettingsAt("/settings/terminal");

    expect(
      await screen.findByRole("heading", { name: "Terminal y Sucursal" })
    ).toBeTruthy();
  });

  it("renderiza la subpágina de sucursales bajo /settings/sucursales", async () => {
    renderSettingsAt("/settings/sucursales");

    expect(
      await screen.findByRole("heading", { name: "Sucursales" })
    ).toBeTruthy();
  });

  it("redirige una subruta desconocida a /settings/caja", async () => {
    renderSettingsAt("/settings/inexistente");

    expect(
      await screen.findByRole("heading", { name: "Caja y Operación" })
    ).toBeTruthy();
  });

  it("permite acceso directo a /settings/caja cuando viene autorizado desde el estado de navegacion", async () => {
    checkUserIsAdmin.mockResolvedValue(false);

    renderSettingsAt({
      pathname: "/settings",
      state: { authorizedRoute: "/settings/caja" },
    });

    expect(
      await screen.findByRole("heading", { name: "Caja y Operación" })
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Acceso restringido" })
    ).toBeNull();
  });

  it("abre el modal de autorizacion si un no-admin entra a /settings/caja sin autorizacion previa", async () => {
    checkUserIsAdmin.mockResolvedValue(false);

    renderSettingsAt("/settings/caja");

    expect(
      await screen.findByRole("heading", { name: "Acceso restringido" })
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Caja y Operación" })
    ).toBeNull();
  });
});
