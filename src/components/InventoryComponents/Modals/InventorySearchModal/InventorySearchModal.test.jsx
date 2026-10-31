import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InventorySearchModal from "./InventorySearchModal";

const { promoteProductToGlobal } = vi.hoisted(() => ({
  promoteProductToGlobal: vi.fn(),
}));

vi.mock(
  "../../PageInventory/PageOrders/services/promoteProductToGlobalService",
  () => ({ promoteProductToGlobal })
);

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
        "Debe cambiarse a global manualmente en el punto de venta de esas sucursales."
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

  it("no muestra stock, minimo ni filtro de bajo minimo", () => {
    renderModal();

    expect(screen.queryByText(/Stock:/)).toBeNull();
    expect(screen.queryByText(/Mínimo:/)).toBeNull();
    expect(screen.queryByText("Bajo mínimo")).toBeNull();
    expect(screen.queryByLabelText("Solo bajo mínimo")).toBeNull();
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
  });
});
