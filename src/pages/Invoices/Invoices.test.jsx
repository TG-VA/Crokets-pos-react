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
  "../../components/InvoicesComponents/NavbarInvoices/NavbarInvoices",
  () => ({ default: () => <div data-testid="invoices-navbar" /> })
);

vi.mock(
  "../../components/InvoicesComponents/PageInvoices/InvoicesPending/InvoicesPending",
  () => ({ default: () => <h1>Ventas por facturar</h1> })
);

vi.mock(
  "../../components/InvoicesComponents/PageInvoices/InvoicesHistory/InvoicesHistory",
  () => ({ default: () => <h1>Historial</h1> })
);

vi.mock(
  "../../components/InvoicesComponents/PageInvoices/InvoiceCustomers/InvoiceCustomers",
  () => ({ default: () => <h1>Clientes fiscales</h1> })
);

vi.mock(
  "../../components/InvoicesComponents/PageInvoices/InvoiceSettings/InvoiceSettings",
  () => ({ default: () => <h1>Configuración CFDI</h1> })
);

import { checkUserIsAdmin } from "../../lib/permissionsService";
import Invoices from "./Invoices";

const renderInvoicesAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/invoices/*" element={<Invoices />} />
      </Routes>
    </MemoryRouter>
  );

describe("Invoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkUserIsAdmin.mockResolvedValue(true);
  });

  it("respeta la autorizacion fiscal recibida desde Configuracion sin pedir credenciales de nuevo", async () => {
    checkUserIsAdmin.mockResolvedValue(false);

    renderInvoicesAt({
      pathname: "/invoices/configuracion",
      state: { authorizedRoute: "/invoices/configuracion" },
    });

    expect(
      await screen.findByRole("heading", { name: "Configuración CFDI" })
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Acceso restringido" })
    ).toBeNull();
    expect(checkUserIsAdmin).not.toHaveBeenCalled();
  });

  it("abre el modal si un no-admin entra directo sin autorizacion previa", async () => {
    checkUserIsAdmin.mockResolvedValue(false);

    renderInvoicesAt("/invoices/configuracion");

    expect(
      await screen.findByRole("heading", { name: "Acceso restringido" })
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Configuración CFDI" })
    ).toBeNull();
  });
});
