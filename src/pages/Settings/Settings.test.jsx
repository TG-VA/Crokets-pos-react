import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Settings from "./Settings";

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

const renderSettingsAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/settings/*" element={<Settings />} />
      </Routes>
    </MemoryRouter>
  );

describe("Settings", () => {
  it("monta la sub-navbar y redirige /settings a la sección de caja", async () => {
    renderSettingsAt("/settings");

    const nav = await screen.findByRole("navigation", {
      name: "Submenú de configuración",
    });
    expect(nav).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Caja y Operación" })
    ).toBeTruthy();
    expect(screen.getByTestId("global-navbar")).toBeTruthy();
    expect(screen.getByTestId("footer")).toBeTruthy();
  });

  it("renderiza la subpágina de usuarios bajo /settings/usuarios", () => {
    renderSettingsAt("/settings/usuarios");

    expect(
      screen.getByRole("heading", { name: "Usuarios y Permisos" })
    ).toBeTruthy();
  });

  it("renderiza la subpágina de impresión bajo /settings/impresion", () => {
    renderSettingsAt("/settings/impresion");

    expect(
      screen.getByRole("heading", { name: "Impresión y Tickets" })
    ).toBeTruthy();
  });

  it("renderiza la subpágina de terminal bajo /settings/terminal", () => {
    renderSettingsAt("/settings/terminal");

    expect(
      screen.getByRole("heading", { name: "Terminal y Sucursal" })
    ).toBeTruthy();
  });

  it("redirige una subruta desconocida a /settings/caja", async () => {
    renderSettingsAt("/settings/inexistente");

    expect(
      await screen.findByRole("heading", { name: "Caja y Operación" })
    ).toBeTruthy();
  });
});
