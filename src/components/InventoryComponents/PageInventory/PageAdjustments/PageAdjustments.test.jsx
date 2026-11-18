import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import PageAdjustments from "./PageAdjustments";

const { adjustmentState } = vi.hoisted(() => ({
  adjustmentState: {
    products: [],
    loadingProducts: false,
    productsError: null,
    searchModalOpen: true,
    barcode: "",
    selectedProduct: null,
    appModal: { isOpen: false },
    setSubmitArmed: vi.fn(),
    closeSearchModal: vi.fn(),
    closeAppModal: vi.fn(),
    handleBarcodeChange: vi.fn(),
    handleLookup: vi.fn(),
    loadProduct: vi.fn(),
  },
}));

vi.mock("./hooks/useInventoryAdjustment", () => ({
  default: () => adjustmentState,
}));

vi.mock("./hooks/useInventoryAdjustmentKeyboard", () => ({
  default: () => ({ handleContentKeyDown: vi.fn() }),
}));

vi.mock("../../../AdminAuthorizationModal/AdminAuthorizationModal", () => ({
  default: ({ isOpen, action, branchId }) =>
    isOpen ? (
      <div data-testid="admin-auth-modal">{`${action}|${branchId}`}</div>
    ) : null,
}));

vi.mock("./components/InventoryAdjustmentForm", () => ({
  default: () => null,
}));

describe("PageAdjustments buscador de productos", () => {
  afterEach(() => {
    Object.assign(adjustmentState, {
      loadingProducts: false,
      productsError: null,
      reauthorizationOpen: false,
      branchId: undefined,
    });
  });

  it("muestra la carga del inventario en el buscador", () => {
    adjustmentState.loadingProducts = true;

    render(<PageAdjustments />);

    expect(screen.getByText("Cargando inventario...")).toBeTruthy();
  });

  it("muestra el error de productos en el buscador", () => {
    adjustmentState.productsError = "Error al cargar";

    render(<PageAdjustments />);

    expect(screen.getByText("Error al cargar")).toBeTruthy();
  });
});

describe("PageAdjustments reautorizacion", () => {
  afterEach(() => {
    Object.assign(adjustmentState, {
      reauthorizationOpen: false,
      branchId: undefined,
    });
  });

  it("pide el grant de ajustes para la sucursal activa", () => {
    Object.assign(adjustmentState, {
      reauthorizationOpen: true,
      branchId: "branch-1",
    });

    render(<PageAdjustments />);

    expect(screen.getByTestId("admin-auth-modal").textContent).toBe(
      "inventory_adjust_access|branch-1"
    );
  });
});
