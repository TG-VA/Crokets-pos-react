import { describe, it, expect, afterEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import PageTransfers from "./PageTransfers";

const { transfersState, lastSearchModalProps } = vi.hoisted(() => ({
  transfersState: {
    activeTab: "send",
    loadingProducts: false,
    productsError: null,
    searchModalOpen: true,
    searchableProducts: [],
    draftItems: [],
    originBranchName: "Centro",
    handleProductPromoted: vi.fn(),
    closeSearchModal: vi.fn(),
    loadProductForTransfer: vi.fn(),
  },
  lastSearchModalProps: { current: null },
}));

vi.mock(
  "../../Modals/InventorySearchModal/InventorySearchModal",
  async (importOriginal) => {
    const { default: ActualInventorySearchModal } = await importOriginal();

    return {
      default: (props) => {
        lastSearchModalProps.current = props;
        return <ActualInventorySearchModal {...props} />;
      },
    };
  }
);

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
    lastSearchModalProps.current = null;
    transfersState.handleProductPromoted.mockClear();
    Object.assign(transfersState, {
      loadingProducts: false,
      productsError: null,
      searchableProducts: [],
      draftItems: [],
      originBranchName: "Centro",
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

  it("muestra stock, agotados y locales de la sucursal origen", () => {
    transfersState.searchableProducts = [
      {
        id: "g1",
        codigo: "G-1",
        descripcion: "Alimento global",
        existencia: 5,
        is_global: true,
        tracks_inventory: true,
      },
      {
        id: "g0",
        codigo: "G-0",
        descripcion: "Alimento agotado",
        existencia: 0,
        is_global: true,
        tracks_inventory: true,
      },
      {
        id: "l1",
        codigo: "L-1",
        descripcion: "Juguete local",
        existencia: 3,
        is_global: false,
        tracks_inventory: true,
      },
    ];

    render(<PageTransfers />);

    expect(screen.getByText("Stock: 0")).toBeTruthy();
    expect(screen.getByText("Producto local de Centro")).toBeTruthy();

    const outOfStockItem = screen
      .getByText("Alimento agotado")
      .closest("[data-search-result]");
    const localItem = screen
      .getByText("Juguete local")
      .closest("[data-search-result]");

    expect(outOfStockItem.getAttribute("aria-disabled")).toBe("true");
    expect(localItem.getAttribute("aria-disabled")).toBe("true");
  });

  it("cablea onProductPromoted del buscador con el handler de la pagina", () => {
    render(<PageTransfers />);

    expect(lastSearchModalProps.current).not.toBeNull();

    act(() => {
      lastSearchModalProps.current.onProductPromoted();
    });

    expect(transfersState.handleProductPromoted).toHaveBeenCalledTimes(1);
  });
});
