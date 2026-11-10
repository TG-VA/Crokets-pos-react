import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import KitSelectedProductsSection from "./KitSelectedProductsSection";

vi.mock("../hooks/useKitProductBranches", () => ({
  useKitProductBranches: () => ({}),
}));

const product = { id: 1, name: "Croqueta", sale_price: 100, quantity: 1 };

const renderSection = (overrides = {}) => {
  const props = {
    selectedProducts: [product],
    selectedProductId: null,
    setSelectedProductId: vi.fn(),
    updateProductQuantity: vi.fn(),
    removeSelectedProduct: vi.fn(),
    ...overrides,
  };
  render(<KitSelectedProductsSection {...props} />);
  return props;
};

const removeButton = () =>
  screen.getByRole("button", { name: "Remover seleccionado" });

describe("KitSelectedProductsSection remover seleccionado", () => {
  it("esta deshabilitado sin producto seleccionado", () => {
    renderSection();
    expect(removeButton().disabled).toBe(true);
  });

  it("con producto seleccionado llama a removeSelectedProduct", () => {
    const props = renderSection({ selectedProductId: 1 });
    expect(removeButton().disabled).toBe(false);
    fireEvent.click(removeButton());
    expect(props.removeSelectedProduct).toHaveBeenCalledTimes(1);
  });
});
