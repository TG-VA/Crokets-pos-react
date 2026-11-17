import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../contexts/PendingTransfersContext", () => ({
  usePendingTransfers: vi.fn(),
}));

vi.mock("../../../contexts/PendingOrdersContext", () => ({
  usePendingOrders: vi.fn(),
}));

vi.mock("../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "branch-1" } }),
}));

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("../../../lib/permissionsService", () => ({
  checkUserIsAdmin: vi.fn(),
}));

vi.mock("../../AdminAuthorizationModal/AdminAuthorizationModal", () => ({
  default: ({ isOpen, action }) =>
    isOpen ? <div data-testid="admin-auth-modal">{action}</div> : null,
}));

import { checkUserIsAdmin } from "../../../lib/permissionsService";
import { usePendingTransfers } from "../../../contexts/PendingTransfersContext";
import { usePendingOrders } from "../../../contexts/PendingOrdersContext";
import NavbarInventory from "./NavbarInventory";

const renderNavbar = () =>
  render(
    <MemoryRouter>
      <NavbarInventory />
    </MemoryRouter>
  );

describe("NavbarInventory - badge de traspasos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePendingOrders.mockReturnValue({ pendingOrdersCount: 0 });
  });

  it("renderiza el badge con el conteo cuando hay recepciones pendientes", () => {
    usePendingTransfers.mockReturnValue({ pendingReceiptsCount: 3 });

    renderNavbar();

    const badge = screen.getByRole("status");
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe("3");
    expect(badge.getAttribute("aria-label")).toBe(
      "3 recepciones pendientes de inventario"
    );
  });

  it("no renderiza el badge cuando pendingReceiptsCount es 0", () => {
    usePendingTransfers.mockReturnValue({ pendingReceiptsCount: 0 });

    renderNavbar();

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("el badge solo aparece en el item Traspasos y es unico", () => {
    usePendingTransfers.mockReturnValue({ pendingReceiptsCount: 5 });

    const { container } = renderNavbar();

    const badges = container.querySelectorAll('[role="status"]');
    expect(badges.length).toBe(1);

    const traspasosButton = screen.getByText("Traspasos").closest("a");
    expect(traspasosButton.contains(badges[0])).toBe(true);
  });
});

describe("NavbarInventory - seccion Agregar protegida", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePendingTransfers.mockReturnValue({ pendingReceiptsCount: 0 });
    usePendingOrders.mockReturnValue({ pendingOrdersCount: 0 });
  });

  it("pide autorizacion de administrador a un usuario no admin", async () => {
    checkUserIsAdmin.mockResolvedValue(false);

    renderNavbar();
    fireEvent.click(screen.getByText("Agregar"));

    const modal = await screen.findByTestId("admin-auth-modal");
    expect(modal.textContent).toBe("inventory_add_access");
  });

  it("no pide autorizacion a un administrador", async () => {
    checkUserIsAdmin.mockResolvedValue(true);

    renderNavbar();
    fireEvent.click(screen.getByText("Agregar"));

    await waitFor(() => expect(checkUserIsAdmin).toHaveBeenCalled());
    expect(screen.queryByTestId("admin-auth-modal")).toBeNull();
  });

  it("deja publicas las demas secciones", () => {
    renderNavbar();
    fireEvent.click(screen.getByText("Kardex"));

    expect(checkUserIsAdmin).not.toHaveBeenCalled();
  });
});
