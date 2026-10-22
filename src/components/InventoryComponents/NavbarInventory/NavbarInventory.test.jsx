import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../contexts/PendingTransfersContext", () => ({
  usePendingTransfers: vi.fn(),
}));

vi.mock("../../../contexts/PendingOrdersContext", () => ({
  usePendingOrders: vi.fn(),
}));

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
