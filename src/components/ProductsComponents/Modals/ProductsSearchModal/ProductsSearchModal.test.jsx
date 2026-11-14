import { describe, it, expect, onTestFinished, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("declara el buscador como dialogo con su titulo", () => {
    renderModal();
    expect(
      screen.getByRole("dialog", { name: "Búsqueda de Productos" })
    ).toBeTruthy();
  });

  it("no muestra la pista F10", () => {
    renderModal();
    expect(screen.queryByText(/F10/)).toBeNull();
  });

  it("cierra con la tecla Escape", () => {
    const onClose = vi.fn();
    render(
      <ProductsSearchModal
        isOpen
        onClose={onClose}
        onSelect={vi.fn()}
        products={[]}
      />
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("no lista los kits, que se administran en Promociones", () => {
    // jsdom no implementa scrollIntoView, que el hook usa al seleccionar.
    // Se restaura al terminar para no filtrar el stub a otros tests.
    const originalScrollIntoView = window.Element.prototype.scrollIntoView;
    window.Element.prototype.scrollIntoView = vi.fn();
    onTestFinished(() => {
      if (originalScrollIntoView) {
        window.Element.prototype.scrollIntoView = originalScrollIntoView;
      } else {
        delete window.Element.prototype.scrollIntoView;
      }
    });

    render(
      <ProductsSearchModal
        isOpen
        onClose={vi.fn()}
        onSelect={vi.fn()}
        products={[
          {
            codigo: "A-1",
            descripcion: "Croqueta adulto",
            departamento: "Kits",
          },
          {
            codigo: "K-1",
            descripcion: "Kit de bienvenida",
            departamento: "Kits",
            is_kit: true,
          },
          {
            codigo: "S-1",
            descripcion: "Bano y corte",
            departamento: "Kits",
            tracks_inventory: false,
          },
        ]}
      />
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "kits" },
    });

    expect(screen.getByText("Croqueta adulto")).toBeTruthy();
    expect(screen.getByText("Bano y corte")).toBeTruthy();
    expect(screen.queryByText("Kit de bienvenida")).toBeNull();
  });

  it("lista como los buscadores de inventario, sin precio ni stock", () => {
    window.Element.prototype.scrollIntoView = vi.fn();
    render(
      <ProductsSearchModal
        isOpen
        onClose={vi.fn()}
        onSelect={vi.fn()}
        products={[
          {
            codigo: "A-1",
            descripcion: "Croqueta adulto",
            departamento: "Alimento",
            precio: 120,
            existencia: 8,
          },
        ]}
      />
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "croqueta" },
    });

    expect(
      screen.getByText("Croqueta adulto").closest("[data-search-result]")
    ).toBeTruthy();
    expect(screen.queryByText(/\$/)).toBeNull();
    expect(screen.queryByText(/Stock/)).toBeNull();
  });

  it("no lista nada mientras la busqueda esta vacia", () => {
    render(
      <ProductsSearchModal
        isOpen
        onClose={vi.fn()}
        onSelect={vi.fn()}
        products={[{ codigo: "A-1", descripcion: "Croqueta adulto" }]}
      />
    );

    expect(screen.queryByText("Croqueta adulto")).toBeNull();
    expect(
      screen.getByText("Ingresa nombre, código o departamento del producto")
    ).toBeTruthy();
  });
});
