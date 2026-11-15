import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ProductSearchDialog from "./ProductSearchDialog";

const setup = (props = {}) => {
  const handlers = {
    onSearchChange: vi.fn(),
    onSelect: vi.fn(),
    onClose: vi.fn(),
  };
  render(
    <ProductSearchDialog
      searchTerm=""
      resultsCount={0}
      {...handlers}
      {...props}
    >
      <div>Lista de resultados</div>
    </ProductSearchDialog>
  );
  return handlers;
};

describe("ProductSearchDialog", () => {
  it("declara el dialogo con su titulo y renderiza los resultados", () => {
    setup();

    expect(
      screen.getByRole("dialog", { name: "Búsqueda de Productos" })
    ).toBeTruthy();
    expect(screen.getByText("Lista de resultados")).toBeTruthy();
  });

  it("solo tiene los botones Seleccionar y Cerrar", () => {
    setup();

    const labels = screen.getAllByRole("button").map((b) => b.textContent);

    expect(labels).toEqual(["Seleccionar", "Cerrar"]);
  });

  it("notifica el texto buscado", () => {
    const { onSearchChange } = setup();

    fireEvent.change(screen.getByLabelText(/Nombre/), {
      target: { value: "croqueta" },
    });

    expect(onSearchChange).toHaveBeenCalledWith("croqueta");
  });

  it("muestra el conteo solo cuando hay resultados", () => {
    setup({ resultsCount: 3 });

    expect(screen.getByText("3 producto(s)")).toBeTruthy();
  });

  it("oculta el conteo sin resultados", () => {
    setup({ resultsCount: 0 });

    expect(screen.queryByText(/producto\(s\)/)).toBeNull();
  });

  it("usa la etiqueta y el estado del boton de seleccion recibidos", () => {
    const { onSelect } = setup({
      selectLabel: "Producto local",
      selectDisabled: true,
    });

    const button = screen.getByRole("button", { name: "Producto local" });
    fireEvent.click(button);

    expect(button.disabled).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("cierra con el boton Cerrar y con clic en el fondo, no dentro del dialogo", () => {
    const { onClose } = setup();

    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    fireEvent.click(screen.getByRole("dialog").parentElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
