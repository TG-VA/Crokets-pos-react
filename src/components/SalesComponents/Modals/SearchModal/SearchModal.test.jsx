import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "branch-1" } }),
}));

vi.mock("./useSearchModal", () => ({
  useSearchModal: () => ({
    searchTerm: "",
    searchResults: [],
    selectedIndex: -1,
    setSelectedIndex: vi.fn(),
    selectedProduct: null,
    selectedProductStocks: [],
    kitValidation: null,
    loading: false,
    loadingStocks: false,
    addingProduct: false,
    error: null,
    appModal: { isOpen: false },
    resultsListRef: { current: null },
    searchInputRef: { current: null },
    closeAppModal: vi.fn(),
    handleClose: vi.fn(),
    handleInputChange: vi.fn(),
    handleSelectProduct: vi.fn(),
    canAddSelectedProduct: () => false,
    getProductAvailableStock: () => 0,
    getProductCartQuantity: () => 0,
    getDisplayPrice: () => 0,
  }),
}));

import SearchModal from "./SearchModal";

describe("SearchModal", () => {
  it("declara el buscador como dialogo con su titulo", () => {
    render(<SearchModal isOpen onClose={vi.fn()} onAddToSale={vi.fn()} />);

    expect(
      screen.getByRole("dialog", { name: "Búsqueda de productos" })
    ).toBeTruthy();
  });
});
