import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "branch-1" } }),
}));

vi.mock("../../../lib/permissionsService", () => ({
  checkUserIsAdmin: vi.fn(),
}));

import { checkUserIsAdmin } from "../../../lib/permissionsService";
import NavbarSettings from "./NavbarSettings";

const TAB_LABELS = [
  "Caja y Operación",
  "Usuarios y Permisos",
  "Impresión y Tickets",
  "Terminal local",
  "Sucursales",
  "Acceso rápido fiscal",
];

const LocationDisplay = () => {
  const location = useLocation();

  return (
    <>
      <div data-testid="location">{location.pathname}</div>
      <div data-testid="location-state">
        {JSON.stringify(location.state ?? null)}
      </div>
    </>
  );
};

const renderAt = (path, props = {}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <NavbarSettings {...props} />
      <LocationDisplay />
    </MemoryRouter>
  );

describe("NavbarSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkUserIsAdmin.mockResolvedValue(true);
  });

  it("renderiza la navegación accesible con todas las pestañas", () => {
    renderAt("/settings/caja");

    const nav = screen.getByRole("navigation", {
      name: "Submenú de configuración",
    });
    expect(nav).toBeTruthy();

    TAB_LABELS.forEach((label) => {
      expect(screen.getByRole("link", { name: label })).toBeTruthy();
    });
  });

  it("marca aria-current='page' solo en la pestaña activa", () => {
    renderAt("/settings/usuarios");

    expect(
      screen
        .getByRole("link", { name: "Usuarios y Permisos" })
        .getAttribute("aria-current")
    ).toBe("page");

    TAB_LABELS.filter((label) => label !== "Usuarios y Permisos").forEach(
      (label) => {
        expect(
          screen.getByRole("link", { name: label }).getAttribute("aria-current")
        ).toBeNull();
      }
    );
  });

  it("activa la pestaña de caja en /settings/caja", () => {
    renderAt("/settings/caja");

    expect(
      screen
        .getByRole("link", { name: "Caja y Operación" })
        .getAttribute("aria-current")
    ).toBe("page");
  });

  it("enlaza el acceso rápido fiscal fuera del submenú", () => {
    renderAt("/settings/caja");

    const fiscalLink = screen.getByRole("link", {
      name: "Acceso rápido fiscal",
    });
    expect(fiscalLink.getAttribute("href")).toBe("/invoices/configuracion");
    expect(fiscalLink.getAttribute("aria-current")).toBeNull();
  });

  it("navega directo entre pestañas cuando el usuario es administrador", async () => {
    renderAt("/settings/caja");

    fireEvent.click(screen.getByRole("link", { name: "Usuarios y Permisos" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/settings/usuarios"
      );
    });
    expect(checkUserIsAdmin).toHaveBeenCalledWith("user-1");
  });

  it("abre el modal sobre la pantalla actual si no es administrador", async () => {
    checkUserIsAdmin.mockResolvedValue(false);

    renderAt("/settings/caja");

    fireEvent.click(screen.getByRole("link", { name: "Usuarios y Permisos" }));

    expect(
      await screen.findByRole("heading", { name: "Acceso restringido" })
    ).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe("/settings/caja");
  });

  it("protege el acceso rápido fiscal con su propia acción", async () => {
    checkUserIsAdmin.mockResolvedValue(false);

    renderAt("/settings/caja");

    fireEvent.click(screen.getByRole("link", { name: "Acceso rápido fiscal" }));

    expect(
      await screen.findByRole("heading", { name: "Acceso restringido" })
    ).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe("/settings/caja");
  });

  it("transmite la autorización fiscal al módulo de facturas", async () => {
    renderAt("/settings/caja");

    fireEvent.click(screen.getByRole("link", { name: "Acceso rápido fiscal" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/invoices/configuracion"
      );
    });
    expect(screen.getByTestId("location-state").textContent).toBe(
      JSON.stringify({ authorizedRoute: "/invoices/configuracion" })
    );
  });

  it("no vuelve a pedir credenciales para una pestaña ya autorizada", async () => {
    renderAt("/settings/caja", {
      authorizedRoutes: new Set(["/settings/usuarios"]),
    });

    fireEvent.click(screen.getByRole("link", { name: "Usuarios y Permisos" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/settings/usuarios"
      );
    });
    expect(checkUserIsAdmin).not.toHaveBeenCalled();
  });
});
