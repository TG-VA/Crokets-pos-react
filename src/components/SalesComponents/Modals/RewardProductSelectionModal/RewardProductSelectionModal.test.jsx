import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const hookState = vi.hoisted(() => ({ rewardProducts: [], search: "" }));

vi.mock("./useRewardProductSelection", () => ({
  useRewardProductSelection: () => ({
    rewardProducts: hookState.rewardProducts,
    selectedProductsByReward: {},
    searchByReward: { r1: hookState.search },
    setSearchByReward: vi.fn(),
    loadingProducts: false,
    saving: false,
    setSaving: vi.fn(),
    error: "",
    appModal: { isOpen: false },
    closeAppModal: vi.fn(),
    freeProductRewards: [{ id: "r1", name: "Croqueta gratis" }],
    getInventoryStatus: () => ({ available: true, stock: null, label: "" }),
    getSelectedQuantityForReward: () => 0,
    getSelectedQuantityForProduct: () => 0,
    getFilteredOptionsForReward: () => hookState.rewardProducts,
    handleAddProduct: vi.fn(),
    handleSubtractProduct: vi.fn(),
    svc: {
      getRewardQuantity: () => 1,
      getRewardRedeemQuantity: () => 1,
      getRewardProductsPerRedemption: () => 1,
    },
  }),
}));

import RewardProductSelectionModal from "./RewardProductSelectionModal";

const buildModal = () => (
  <RewardProductSelectionModal
    isOpen
    onClose={() => {}}
    onConfirm={() => {}}
    rewards={[{ id: "r1" }]}
  />
);

const renderModal = (count) => {
  hookState.rewardProducts = Array.from({ length: count }, (_, index) => ({
    reward_id: "r1",
    product: {
      id: `p${index + 1}`,
      name: `ALIMENTO ${String(index + 1).padStart(2, "0")}`,
      barcode: `750${index + 1}`,
      sale_price: 100,
    },
  }));

  hookState.search = "";

  return render(buildModal());
};

describe("RewardProductSelectionModal: paginacion de productos", () => {
  it("muestra 5 productos por pagina y los controles de paginacion", () => {
    renderModal(12);

    expect(screen.getAllByText(/^ALIMENTO \d+$/)).toHaveLength(5);
    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
  });

  it("no pagina cuando los productos caben en una pagina", () => {
    renderModal(4);

    expect(screen.getAllByText(/^ALIMENTO \d+$/)).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "Siguiente" })).toBeNull();
  });

  it("ya no ofrece el boton de ver mas productos", () => {
    renderModal(12);

    expect(screen.queryByText(/producto.* más/)).toBeNull();
  });

  it("vuelve a la primera pagina cuando cambia la busqueda", () => {
    const { rerender } = renderModal(12);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Página 2 de 3")).toBeTruthy();

    hookState.search = "ali";
    rerender(buildModal());

    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
  });
});
