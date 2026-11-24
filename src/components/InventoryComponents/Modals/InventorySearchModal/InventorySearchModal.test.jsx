import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InventorySearchModal from "./InventorySearchModal";

const { promoteProductToGlobal } = vi.hoisted(() => ({
  promoteProductToGlobal: vi.fn(),
}));

vi.mock("../../../../services/inventory/promoteProductToGlobalService", () => ({
  promoteProductToGlobal,
}));

const products = [
  {
    id: "global-ok",
    codigo: "G-1",
    descripcion: "Alimento global",
    departamento: "Alimento",
    precio: 10,
    existencia: 20,
    minimo: 5,
    is_global: true,
  },
  {
    id: "global-low",
    codigo: "G-2",
    descripcion: "Shampoo global",
    departamento: "Higiene",
    precio: 20,
    existencia: 2,
    minimo: 5,
    is_global: true,
  },
  {
    id: "local",
    codigo: "L-1",
    descripcion: "Juguete local",
    departamento: "Accesorios",
    precio: 30,
    existencia: 1,
    minimo: 5,
    is_global: false,
  },
];

const renderModal = (props = {}) =>
  render(
    <InventorySearchModal
      isOpen
      onClose={() => {}}
      products={products}
      onSelect={() => {}}
      restrictLocalProducts
      {...props}
    />
  );

describe("InventorySearchModal reglas de pedidos", () => {
  it("deshabilita los productos locales y muestra el motivo", () => {
    const onSelect = vi.fn();

    renderModal({ onSelect });

    const localItem = screen
      .getByText("Juguete local")
      .closest("[data-search-result]");

    expect(localItem.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Producto local o no global")).toBeTruthy();

    fireEvent.click(screen.getByText("Juguete local"));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("permite seleccionar un producto global", () => {
    const onSelect = vi.fn();

    renderModal({ onSelect });

    fireEvent.click(screen.getByText("Alimento global"));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "global-ok" })
    );
  });

  it("indica a que sucursal pertenece un producto local y como habilitarlo", () => {
    renderModal({
      products: [
        {
          id: "local-owned",
          codigo: "L-9",
          descripcion: "Collar local",
          departamento: "Accesorios",
          is_global: false,
          localBranchNames: ["Centro", "Norte"],
        },
      ],
    });

    expect(screen.getByText("Producto local de Centro, Norte")).toBeTruthy();
    expect(
      screen.getByText(
        "Doble clic para volverlo global (administrador) o cambiarlo manualmente en el punto de venta de esas sucursales."
      )
    ).toBeTruthy();
    expect(screen.queryByText(/^\$/)).toBeNull();
  });

  it("no lista los kits porque su inventario depende de sus componentes", () => {
    renderModal({
      products: [
        ...products,
        {
          id: "kit-1",
          codigo: "K-1",
          descripcion: "Kit de bienvenida",
          departamento: "Kits",
          precio: 99,
          is_global: true,
          is_kit: true,
        },
      ],
    });

    expect(screen.getByText("Alimento global")).toBeTruthy();
    expect(screen.queryByText("Kit de bienvenida")).toBeNull();
  });

  it("no lista productos que no usan inventario", () => {
    renderModal({
      products: [
        ...products,
        {
          id: "servicio-1",
          codigo: "S-1",
          descripcion: "Bano y corte",
          departamento: "Servicios",
          precio: 150,
          is_global: true,
          tracks_inventory: false,
        },
      ],
    });

    expect(screen.getByText("Alimento global")).toBeTruthy();
    expect(screen.queryByText("Bano y corte")).toBeNull();
  });

  it("no muestra stock, minimo ni filtro de bajo minimo", () => {
    renderModal();

    expect(screen.queryByText(/Stock:/)).toBeNull();
    expect(screen.queryByText(/Mínimo:/)).toBeNull();
    expect(screen.queryByText("Bajo mínimo")).toBeNull();
    expect(screen.queryByLabelText("Solo bajo mínimo")).toBeNull();
  });

  it("declara el buscador como dialogo con su titulo", () => {
    renderModal();

    expect(
      screen.getByRole("dialog", { name: "Búsqueda de Productos" })
    ).toBeTruthy();
  });

  it("muestra el boton Cerrar sin prefijo de atajo", () => {
    renderModal();

    expect(screen.getByRole("button", { name: "Cerrar" })).toBeTruthy();
    expect(screen.queryByText("ESC - Cerrar")).toBeNull();
  });

  it("no muestra el boton X de la cabecera", () => {
    renderModal();

    expect(
      screen.queryByRole("button", { name: "Cerrar búsqueda de productos" })
    ).toBeNull();
  });

  describe("stock de la sucursal origen", () => {
    const outOfStockProduct = {
      id: "global-out",
      codigo: "G-0",
      descripcion: "Alimento agotado",
      departamento: "Alimento",
      precio: 10,
      existencia: 0,
      is_global: true,
    };

    it("muestra el stock cuando showStock esta activo", () => {
      renderModal({
        showStock: true,
        products: [...products, outOfStockProduct],
      });

      expect(screen.getByText("Stock: 20")).toBeTruthy();
      expect(screen.getByText("Stock: 0")).toBeTruthy();
    });

    it("bloquea un producto agotado y muestra el motivo en el boton", () => {
      const onSelect = vi.fn();
      window.Element.prototype.scrollIntoView = vi.fn();

      renderModal({
        showStock: true,
        onSelect,
        products: [outOfStockProduct],
      });

      const item = screen
        .getByText("Alimento agotado")
        .closest("[data-search-result]");

      expect(item.getAttribute("aria-disabled")).toBe("true");
      expect(screen.getByText("Stock: 0")).toBeTruthy();
      expect(screen.getByText("SIN STOCK")).toBeTruthy();

      fireEvent.click(screen.getByText("Alimento agotado"));
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "Enter" });

      expect(onSelect).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Sin stock" })).toBeTruthy();
    });

    it("no abre la confirmacion de global al hacer doble clic en un agotado", () => {
      renderModal({
        showStock: true,
        products: [outOfStockProduct],
      });

      fireEvent.doubleClick(screen.getByText("Alimento agotado"));

      expect(screen.queryByText("Volver global este producto")).toBeNull();
    });

    it("usa el nombre de la sucursal origen en el label local", () => {
      renderModal({
        localBranchName: "Centro",
        products: [
          {
            id: "local-origin",
            codigo: "L-2",
            descripcion: "Correa local",
            departamento: "Accesorios",
            is_global: false,
            existencia: 3,
          },
        ],
      });

      expect(screen.getByText("Producto local de Centro")).toBeTruthy();
    });
  });

  describe("volver global un producto local", () => {
    beforeEach(() => {
      promoteProductToGlobal.mockReset();
      promoteProductToGlobal.mockResolvedValue({ success: true });
    });

    it("abre la confirmacion al hacer doble clic en un producto local", () => {
      renderModal();

      fireEvent.doubleClick(screen.getByText("Juguete local"));

      expect(screen.getByText("Volver global este producto")).toBeTruthy();
    });

    it("no abre la confirmacion con un producto global", () => {
      renderModal();

      fireEvent.doubleClick(screen.getByText("Alimento global"));

      expect(screen.queryByText("Volver global este producto")).toBeNull();
    });

    it("promueve el producto, avisa al padre y cierra la confirmacion", async () => {
      const onProductPromoted = vi.fn();
      renderModal({ onProductPromoted });

      fireEvent.doubleClick(screen.getByText("Juguete local"));
      fireEvent.change(screen.getByRole("textbox", { name: /CONFIRMAR/ }), {
        target: { value: "CONFIRMAR" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Volver global" }));

      await waitFor(() => expect(onProductPromoted).toHaveBeenCalledTimes(1));
      expect(promoteProductToGlobal).toHaveBeenCalledWith("local");
      expect(screen.queryByText("Volver global este producto")).toBeNull();
    });

    it("Escape cierra solo la confirmacion y no el buscador", () => {
      const onClose = vi.fn();
      renderModal({ onClose });

      fireEvent.doubleClick(screen.getByText("Juguete local"));
      expect(screen.getByText("Volver global este producto")).toBeTruthy();
      fireEvent.keyDown(window, { key: "Escape" });

      expect(screen.queryByText("Volver global este producto")).toBeNull();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("clic en el fondo de la confirmacion no cierra el buscador", () => {
      const onClose = vi.fn();
      renderModal({ onClose });

      fireEvent.doubleClick(screen.getByText("Juguete local"));
      const confirmDialog = screen.getByRole("dialog", {
        name: "Volver global este producto",
      });
      fireEvent.click(confirmDialog.parentElement);

      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText("Búsqueda de Productos")).toBeTruthy();
      expect(screen.queryByText("Volver global este producto")).toBeNull();
    });
  });
});
