import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("../../../lib/permissionsService", () => ({
  checkUserIsAdmin: vi.fn(),
}));

vi.mock("../../AdminAuthorizationModal/AdminAuthorizationModal", () => ({
  default: ({ isOpen, onAuthorized }) =>
    isOpen ? (
      <button type="button" onClick={onAuthorized}>
        autorizar
      </button>
    ) : null,
}));

import { checkUserIsAdmin } from "../../../lib/permissionsService";
import NavbarCustomers from "./NavbarCustomers";

const ADJUSTMENT_KEY = "customers_points_adjustment_admin_authorized";
const SETTINGS_KEY = "customers_rewards_settings_admin_authorized";

const LocationDisplay = () => (
  <div data-testid="location">{useLocation().pathname}</div>
);

const renderNavbar = () =>
  render(
    <MemoryRouter initialEntries={["/customers"]}>
      <NavbarCustomers />
      <LocationDisplay />
    </MemoryRouter>
  );

const location = () => screen.getByTestId("location").textContent;

describe("NavbarCustomers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("un admin entra directo y solo queda autorizada esa opcion", async () => {
    checkUserIsAdmin.mockResolvedValue(true);
    sessionStorage.setItem(SETTINGS_KEY, "true");
    renderNavbar();

    fireEvent.click(screen.getByRole("link", { name: /Ajuste de puntos/ }));

    await waitFor(() => expect(location()).toBe("/customers/ajuste-puntos"));
    expect(checkUserIsAdmin).toHaveBeenCalledWith("user-1");
    expect(sessionStorage.getItem(ADJUSTMENT_KEY)).toBe("true");
    expect(sessionStorage.getItem(SETTINGS_KEY)).toBeNull();
  });

  it("un no admin pide autorizacion antes de navegar", async () => {
    checkUserIsAdmin.mockResolvedValue(false);
    renderNavbar();

    fireEvent.click(
      screen.getByRole("link", { name: /Configurar recompensas/ })
    );

    const authorize = await screen.findByRole("button", { name: "autorizar" });
    expect(location()).toBe("/customers");
    expect(sessionStorage.getItem(SETTINGS_KEY)).toBeNull();

    fireEvent.click(authorize);

    expect(location()).toBe("/customers/recompensas");
    expect(sessionStorage.getItem(SETTINGS_KEY)).toBe("true");
  });

  it("una opcion libre borra las autorizaciones sin consultar el rol", () => {
    sessionStorage.setItem(ADJUSTMENT_KEY, "true");
    sessionStorage.setItem(SETTINGS_KEY, "true");
    renderNavbar();

    fireEvent.click(screen.getByRole("link", { name: /Historial de puntos/ }));

    expect(location()).toBe("/customers/historial");
    expect(checkUserIsAdmin).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(ADJUSTMENT_KEY)).toBeNull();
    expect(sessionStorage.getItem(SETTINGS_KEY)).toBeNull();
  });
});
