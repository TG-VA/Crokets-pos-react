import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NavbarSettings from "./NavbarSettings";

const TAB_LABELS = [
  "Caja y Operación",
  "Usuarios y Permisos",
  "Impresión y Tickets",
  "Terminal y Sucursal",
  "Acceso rápido fiscal",
];

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <NavbarSettings />
    </MemoryRouter>
  );

describe("NavbarSettings", () => {
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
});
