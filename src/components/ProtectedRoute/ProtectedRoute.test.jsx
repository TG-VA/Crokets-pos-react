import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("../AdminAuthorizationModal/AdminAuthorizationModal", () => ({
  default: ({ isOpen, onAuthorized, onClose, action, targetId, branchId }) =>
    isOpen ? (
      <div data-testid="admin-modal">
        <span data-testid="modal-action">{action}</span>
        <span data-testid="modal-target">{targetId}</span>
        <span data-testid="modal-branch">{branchId}</span>
        <button onClick={() => onAuthorized?.()}>autorizar</button>
        <button onClick={() => onClose?.()}>cerrar</button>
      </div>
    ) : null,
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "branch-1" } }),
}));

vi.mock("../../lib/permissionsService", () => ({
  checkUserIsAdmin: vi.fn(),
}));

import { checkUserIsAdmin } from "../../lib/permissionsService";
import useProtectedNavigation from "../../hooks/useProtectedNavigation";
import ProtectedRoute from "./ProtectedRoute";

const LocationDisplay = () => {
  const location = useLocation();

  return <div data-testid="location">{location.pathname}</div>;
};

const renderProtected = (props = {}) =>
  render(
    <MemoryRouter initialEntries={["/reports/ventas"]}>
      <ProtectedRoute
        routePath="/reports/ventas"
        routeLabel="Ventas"
        action="reports_sales_access"
        {...props}
      >
        <div data-testid="protected-content">contenido</div>
      </ProtectedRoute>
      <LocationDisplay />
    </MemoryRouter>
  );

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el contenido si el usuario es admin", async () => {
    checkUserIsAdmin.mockResolvedValue(true);

    renderProtected();

    expect(await screen.findByTestId("protected-content")).toBeTruthy();
    expect(screen.queryByTestId("admin-modal")).toBeNull();
  });

  it("no muestra una pantalla intermedia mientras verifica el acceso", () => {
    checkUserIsAdmin.mockReturnValue(new Promise(() => {}));

    renderProtected();

    expect(screen.queryByText("Verificando acceso...")).toBeNull();
    expect(screen.queryByTestId("protected-content")).toBeNull();
  });

  it("abre el modal sin renderizar el mensaje de bloqueo detrás", async () => {
    checkUserIsAdmin.mockResolvedValue(false);

    renderProtected();

    expect(await screen.findByTestId("admin-modal")).toBeTruthy();
    expect(
      screen.queryByText(
        "Se requiere autorización de administrador para entrar a esta sección."
      )
    ).toBeNull();

    expect(screen.getByTestId("modal-action").textContent).toBe(
      "reports_sales_access"
    );
    expect(screen.getByTestId("modal-target").textContent).toBe(
      "/reports/ventas"
    );
    expect(screen.getByTestId("modal-branch").textContent).toBe("branch-1");
  });

  it("deja pasar sin consultar al backend si la ruta ya está autorizada", () => {
    const authorizedRoutes = new Set(["/reports/ventas"]);

    renderProtected({ authorizedRoutes });

    expect(screen.getByTestId("protected-content")).toBeTruthy();
    expect(checkUserIsAdmin).not.toHaveBeenCalled();
  });

  it("al autorizar por deep-link registra la ruta y muestra el contenido", async () => {
    checkUserIsAdmin.mockResolvedValue(false);
    const onAuthorizedRoute = vi.fn();

    renderProtected({ onAuthorizedRoute });

    fireEvent.click(await screen.findByText("autorizar"));

    await waitFor(() => {
      expect(screen.getByTestId("protected-content")).toBeTruthy();
    });
    expect(onAuthorizedRoute).toHaveBeenCalledWith("/reports/ventas");
  });

  it("al cerrar sin autorizar redirige al fallback sin dejar pantalla muerta", async () => {
    checkUserIsAdmin.mockResolvedValue(false);

    renderProtected();

    fireEvent.click(await screen.findByText("cerrar"));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe("/dashboard");
    });
    expect(screen.queryByTestId("admin-modal")).toBeNull();
    expect(screen.queryByTestId("protected-content")).toBeNull();
  });
});

const PageHarness = () => {
  const [authorizedRoutes, setAuthorizedRoutes] = React.useState(
    () => new Set()
  );

  const handleAuthorizedRoute = (routePath) =>
    setAuthorizedRoutes((prev) => {
      const next = new Set(prev);
      next.add(routePath);
      return next;
    });

  const { handleNavigation, adminAuthOpen, onAuthorizedAdminAuth } =
    useProtectedNavigation(handleAuthorizedRoute);

  const option = {
    id: "ventas",
    label: "Ventas",
    path: "/reports/ventas",
    routePath: "/reports/ventas",
    routeLabel: "Ventas",
    action: "reports_sales_access",
  };

  return (
    <>
      <button onClick={(event) => handleNavigation(option, event)}>
        ir a ventas
      </button>

      <Routes>
        <Route path="/reports" element={<div>inicio reportes</div>} />
        <Route
          path="/reports/ventas"
          element={
            <ProtectedRoute
              routePath={option.routePath}
              routeLabel={option.routeLabel}
              action={option.action}
              authorizedRoutes={authorizedRoutes}
              onAuthorizedRoute={handleAuthorizedRoute}
            >
              <div data-testid="protected-content">contenido</div>
            </ProtectedRoute>
          }
        />
      </Routes>

      {adminAuthOpen ? (
        <button onClick={onAuthorizedAdminAuth}>autorizar-navbar</button>
      ) : null}
    </>
  );
};

describe("ProtectedRoute + useProtectedNavigation (integración)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tras autorizar en la navbar, el guard deja pasar sin una segunda autorización", async () => {
    checkUserIsAdmin.mockResolvedValue(false);

    render(
      <MemoryRouter initialEntries={["/reports"]}>
        <PageHarness />
      </MemoryRouter>
    );

    expect(screen.getByText("inicio reportes")).toBeTruthy();

    fireEvent.click(screen.getByText("ir a ventas"));

    const authorizeButton = await screen.findByText("autorizar-navbar");
    expect(screen.queryByTestId("protected-content")).toBeNull();

    fireEvent.click(authorizeButton);

    expect(await screen.findByTestId("protected-content")).toBeTruthy();
    expect(checkUserIsAdmin).toHaveBeenCalledTimes(1);
  });
});
