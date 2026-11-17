import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../../components/Navbar/Navbar", () => ({ default: () => null }));
vi.mock("../../components/Footer/Footer", () => ({ default: () => null }));
vi.mock(
  "../../components/InventoryComponents/NavbarInventory/NavbarInventory",
  () => ({ default: () => null })
);

const { page } = vi.hoisted(() => ({
  page: (testId) => ({
    default: () => <div data-testid={testId} />,
  }),
}));

vi.mock(
  "../../components/InventoryComponents/PageInventory/PageAdd/PageAdd",
  () => page("page-add")
);
vi.mock(
  "../../components/InventoryComponents/PageInventory/PageAdjustments/PageAdjustments",
  () => page("page-adjustments")
);
vi.mock(
  "../../components/InventoryComponents/PageInventory/PageReport/PageReport",
  () => page("page-report")
);
vi.mock(
  "../../components/InventoryComponents/PageInventory/PageMovementsReport/PageMovementsReport",
  () => page("page-movements")
);
vi.mock(
  "../../components/InventoryComponents/PageInventory/PageKardex/Pagekardex",
  () => page("page-kardex")
);
vi.mock(
  "../../components/InventoryComponents/PageInventory/PageTransfers/PageTransfers",
  () => page("page-transfers")
);
vi.mock(
  "../../components/InventoryComponents/PageInventory/PageOrders/PageOrders",
  () => page("page-orders")
);

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "branch-1" } }),
}));

vi.mock("../../lib/permissionsService", () => ({
  checkUserIsAdmin: vi.fn(),
}));

vi.mock(
  "../../components/AdminAuthorizationModal/AdminAuthorizationModal",
  () => ({
    default: ({ isOpen, action }) =>
      isOpen ? <div data-testid="admin-auth-modal">{action}</div> : null,
  })
);

import { checkUserIsAdmin } from "../../lib/permissionsService";
import Inventory from "./Inventory";

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/inventory/*" element={<Inventory />} />
      </Routes>
    </MemoryRouter>
  );

describe("Inventory - enrutado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("abre en Reporte inventario y no en Agregar", () => {
    renderAt("/inventory");

    expect(screen.getByTestId("page-report")).toBeTruthy();
    expect(screen.queryByTestId("page-add")).toBeNull();
    expect(checkUserIsAdmin).not.toHaveBeenCalled();
  });

  it("la URL directa de Agregar pide autorizacion a un no admin", async () => {
    checkUserIsAdmin.mockResolvedValue(false);

    renderAt("/inventory/agregar");

    const modal = await screen.findByTestId("admin-auth-modal");
    expect(modal.textContent).toBe("inventory_add_access");
    expect(screen.queryByTestId("page-add")).toBeNull();
  });

  it("un admin entra directo a Agregar", async () => {
    checkUserIsAdmin.mockResolvedValue(true);

    renderAt("/inventory/agregar");

    await waitFor(() => expect(screen.getByTestId("page-add")).toBeTruthy());
    expect(screen.queryByTestId("admin-auth-modal")).toBeNull();
  });
});
