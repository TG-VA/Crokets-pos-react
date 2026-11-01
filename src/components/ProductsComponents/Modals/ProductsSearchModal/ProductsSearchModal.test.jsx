import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductsSearchModal from "./ProductsSearchModal";

const renderModal = () =>
  render(
    <ProductsSearchModal
      isOpen
      onClose={vi.fn()}
      onSelect={vi.fn()}
      products={[]}
    />
  );

describe("ProductsSearchModal", () => {
  it("muestra el boton Cerrar sin prefijo de atajo", () => {
    renderModal();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeTruthy();
  });

  it("no muestra el boton X de la cabecera", () => {
    renderModal();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("no muestra la pista F10", () => {
    renderModal();
    expect(screen.queryByText(/F10/)).toBeNull();
  });
});
