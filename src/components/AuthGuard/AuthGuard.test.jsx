import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const branchState = vi.hoisted(() => ({ current: null }));
const authState = vi.hoisted(() => ({ cashRegistered: true }));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLocked: false,
    cashRegistered: authState.cashRegistered,
  }),
}));

vi.mock("../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: branchState.current }),
}));

vi.mock("../../lib/supabaseClient", () => ({ supabase: {} }));

import AuthGuard from "./AuthGuard";

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/dashboard"
          element={<AuthGuard>Pantalla de ventas</AuthGuard>}
        />
        <Route
          path="/cashcut/*"
          element={<AuthGuard>Pantalla de corte</AuthGuard>}
        />
        <Route
          path="/reports/*"
          element={<AuthGuard>Pantalla de reportes</AuthGuard>}
        />
        <Route
          path="/cash-register"
          element={
            <AuthGuard requireCashRegister={false} requireNoCashRegister>
              Apertura de caja
            </AuthGuard>
          }
        />
      </Routes>
    </MemoryRouter>
  );

describe("AuthGuard por tipo de sucursal", () => {
  beforeEach(() => {
    branchState.current = { id: "b1", branch_type: "operational" };
    authState.cashRegistered = true;
  });

  it("una terminal operativa entra a Ventas", () => {
    renderAt("/dashboard");

    expect(screen.getByText("Pantalla de ventas")).toBeTruthy();
  });

  it.each(["/dashboard", "/cashcut/historial"])(
    "una terminal admin que abre %s termina en Reportes",
    (path) => {
      branchState.current = { id: "adm", branch_type: "admin" };
      renderAt(path);

      expect(screen.getByText("Pantalla de reportes")).toBeTruthy();
    }
  );

  it("una terminal admin entra a Reportes", () => {
    branchState.current = { id: "adm", branch_type: "admin" };
    renderAt("/reports");

    expect(screen.getByText("Pantalla de reportes")).toBeTruthy();
  });
});

describe("AuthGuard y caja en terminal admin", () => {
  beforeEach(() => {
    authState.cashRegistered = false;
  });

  it("una terminal operativa sin caja va a la apertura de caja", () => {
    branchState.current = { id: "b1", branch_type: "operational" };
    renderAt("/reports");

    expect(screen.getByText("Apertura de caja")).toBeTruthy();
  });

  it("una terminal admin entra a Reportes sin abrir caja", () => {
    branchState.current = { id: "adm", branch_type: "admin" };
    renderAt("/reports");

    expect(screen.getByText("Pantalla de reportes")).toBeTruthy();
  });

  it("una terminal admin que llega a la apertura de caja va a Reportes", () => {
    branchState.current = { id: "adm", branch_type: "admin" };
    renderAt("/cash-register");

    expect(screen.getByText("Pantalla de reportes")).toBeTruthy();
  });
});
