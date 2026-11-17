import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import PageTransfers from "./PageTransfers";

const { transfersState } = vi.hoisted(() => ({
  transfersState: {
    activeTab: "send",
    loadingProducts: false,
    productsError: null,
    searchModalOpen: true,
    searchableProducts: [],
    closeSearchModal: vi.fn(),
    loadProductForTransfer: vi.fn(),
  },
}));

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/inventory/traspasos" }),
}));

vi.mock("./hooks/useTransfersPage", () => ({
  default: () => transfersState,
}));

vi.mock("./components/HeroSection", () => ({ default: () => null }));
vi.mock("./components/FeedbackBanner", () => ({ default: () => null }));
vi.mock("./components/RouteTabs", () => ({ default: () => null }));
vi.mock("./components/SendWorkspace", () => ({ default: () => null }));
vi.mock("./components/ReceiveWorkspace", () => ({ default: () => null }));
vi.mock("./components/HistoryTable", () => ({ default: () => null }));
vi.mock("./components/modals/CancelConfirmModal", () => ({
  default: () => null,
}));
vi.mock("./components/modals/TransferDetailModal", () => ({
  default: () => null,
}));

describe("PageTransfers buscador de productos", () => {
  afterEach(() => {
    Object.assign(transfersState, {
      loadingProducts: false,
      productsError: null,
    });
  });

  it("muestra la carga del inventario en el buscador", () => {
    transfersState.loadingProducts = true;

    render(<PageTransfers />);

    expect(screen.getByText("Cargando inventario...")).toBeTruthy();
  });

  it("muestra el error de productos en el buscador", () => {
    transfersState.productsError = "Error al cargar";

    render(<PageTransfers />);

    expect(screen.getByText("Error al cargar")).toBeTruthy();
  });
});
