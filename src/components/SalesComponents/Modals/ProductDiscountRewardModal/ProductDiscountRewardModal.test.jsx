import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const hookState = vi.hoisted(() => ({ products: [], searchTerm: "cr" }));

vi.mock("./useProductDiscountReward", async (importOriginal) => ({
  ...(await importOriginal()),
  useProductDiscountReward: () => ({
    searchTerm: hookState.searchTerm,
    setSearchTerm: vi.fn(),
    inventoryByProduct: {},
    loadingProducts: false,
    saving: false,
    setSaving: vi.fn(),
    error: "",
    setError: vi.fn(),
    appModal: { isOpen: false },
    closeAppModal: vi.fn(),
    showAppWarning: vi.fn(),
    rewardQuantity: 1,
    rewardRedeemQuantity: 1,
    totalUnitsToApply: 1,
    selectedProductsCount: 0,
    selectedProducts: [],
    filteredProducts: hookState.products,
    getInventoryStatus: () => ({ available: true, stock: null, label: "" }),
    handleAddProduct: vi.fn(),
    handleSubtractProduct: vi.fn(),
    productUsesInventory: () => false,
  }),
}));

import ProductDiscountRewardModal from "./ProductDiscountRewardModal";

const buildProducts = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `CROQUETA ${String(index + 1).padStart(2, "0")}`,
    barcode: `750${index + 1}`,
    sale_price: 100,
  }));

const buildModal = () => (
  <ProductDiscountRewardModal
    isOpen
    reward={{ id: "r1", discount_type: "percentage", discount_value: 10 }}
    cartProducts={[]}
    onClose={() => {}}
    onConfirm={() => {}}
  />
);

const renderModal = (count) => {
  hookState.products = buildProducts(count);
  hookState.searchTerm = "cr";

  return render(buildModal());
};

describe("ProductDiscountRewardModal: paginacion de resultados", () => {
  it("muestra 8 productos por pagina y los controles de paginacion", () => {
    renderModal(20);

    expect(screen.getAllByText(/^CROQUETA \d+$/)).toHaveLength(8);
    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
  });

  it("no pagina cuando los resultados caben en una pagina", () => {
    renderModal(8);

    expect(screen.getAllByText(/^CROQUETA \d+$/)).toHaveLength(8);
    expect(screen.queryByRole("button", { name: "Siguiente" })).toBeNull();
  });

  it("vuelve a la primera pagina cuando cambia la busqueda", () => {
    const { rerender } = renderModal(20);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Página 2 de 3")).toBeTruthy();

    hookState.searchTerm = "croq";
    rerender(buildModal());

    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
  });
});
