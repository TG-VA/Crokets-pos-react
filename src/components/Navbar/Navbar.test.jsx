import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "./Navbar";
import styles from "./Navbar.module.css";

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { username: "cajero" },
    lockScreen: vi.fn(),
  }),
}));

vi.mock("../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { code: "01", name: "Centro" } }),
}));

vi.mock("./hooks/useKeyboardShortcuts", () => ({
  useKeyboardShortcuts: () => {},
}));

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>
  );

const settingsButton = () =>
  screen.getByRole("button", { name: /Configuración/ });

describe("Navbar: estado activo de Configuracion", () => {
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
