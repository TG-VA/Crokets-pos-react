import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductsPromotions from "./ProductsPromotions";

const mockState = vi.hoisted(() => ({
  appModal: {},
  removeSelectedProduct: () => {},
  selectedSectionProps: null,
}));

vi.mock("./hooks/useProductsPromotions", () => ({
  useProductsPromotions: () => ({
    form: {},
    updateField: vi.fn(),
    selectedProducts: [],
    kits: [],
    appModal: mockState.appModal,
    closeAppModal: vi.fn(),
    selectedProductsTotal: 0,
    kitPrice: 0,
    kitDiscount: 0,
    kitDiscountPercent: 0,
    showAppAlert: vi.fn(),
    removeSelectedProduct: mockState.removeSelectedProduct,
  }),
}));
vi.mock("./hooks/useKitsList", () => ({
  useKitsList: () => ({
    visibleKits: [],
    filteredKits: [],
    pagination: {},
  }),
}));
vi.mock("./components/KitFormSection", () => ({ default: () => null }));
vi.mock("./components/KitSelectedProductsSection", () => ({
  default: (props) => {
    mockState.selectedSectionProps = props;
    return null;
  },
}));
vi.mock("./components/KitActionsSection", () => ({ default: () => null }));
vi.mock("./components/KitRegisteredListSection", () => ({
  default: () => null,
}));
vi.mock("./components/KitProductSearchModal", () => ({ default: () => null }));
vi.mock("./components/KitDeleteConfirmModal", () => ({ default: () => null }));
vi.mock("../../../../hooks/useIsAdmin", () => ({ useIsAdmin: () => false }));
vi.mock("../../../AppModal/AppModal", () => ({
  default: ({ children }) => <div data-testid="app-modal">{children}</div>,
}));

const baseModal = {
  isOpen: true,
  type: "warning",
  title: "Producto local",
  message: "",
  children: null,
  branches: [],
};

describe("ProductsPromotions aviso con sucursales", () => {
  it("renderiza las sucursales faltantes como badges dentro del modal", () => {
    mockState.appModal = {
      ...baseModal,
      branches: [
        { id: 2, name: "Norte" },
        { id: 3, name: "Coba" },
      ],
    };

    render(<ProductsPromotions />);

    expect(screen.getByText("Norte")).toBeTruthy();
    expect(screen.getByText("Coba")).toBeTruthy();
  });

  it("sin branches renderiza los children del modal", () => {
    mockState.appModal = {
      ...baseModal,
      children: <span>contenido propio</span>,
    };

    render(<ProductsPromotions />);

    expect(screen.getByText("contenido propio")).toBeTruthy();
  });
});

describe("ProductsPromotions seccion de productos del kit", () => {
  it("pasa removeSelectedProduct a la seccion de productos", () => {
    mockState.appModal = { ...baseModal, isOpen: false };

    render(<ProductsPromotions />);

    expect(mockState.selectedSectionProps.removeSelectedProduct).toBe(
      mockState.removeSelectedProduct
    );
  });
});
