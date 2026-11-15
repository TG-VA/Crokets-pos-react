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

vi.mock("./components/InventoryAdjustmentForm", () => ({
  default: () => null,
}));

describe("PageAdjustments buscador de productos", () => {
  afterEach(() => {
    Object.assign(adjustmentState, {
      loadingProducts: false,
      productsError: null,
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
