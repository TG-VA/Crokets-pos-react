import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const productsState = {
  products: [],
  loadingProducts: true,
  productsError: "Error al cargar",
  getProductByCodigo: vi.fn(),
  refreshProducts: vi.fn(),
};

vi.mock("../../../../../contexts/ProductsContext", () => ({
  useProducts: () => productsState,
}));

vi.mock("../../../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "branch-1" } }),
}));

vi.mock("../../../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("../services/inventoryAdjustmentService", () => ({
  applyInventoryAdjustment: vi.fn(),
}));

import useInventoryAdjustment from "./useInventoryAdjustment";

describe("useInventoryAdjustment", () => {
  it("expone el estado de carga y error de productos para el buscador", () => {
    const { result } = renderHook(() => useInventoryAdjustment());

    expect(result.current.loadingProducts).toBe(true);
    expect(result.current.productsError).toBe("Error al cargar");
  });

  it.each([
    ["un kit", { is_kit: true }],
    ["un producto sin inventario", { tracks_inventory: false }],
  ])("rechaza %s capturado por codigo de barras", (_label, overrides) => {
    productsState.getProductByCodigo.mockReturnValue({
      id: "p1",
      codigo: "COD-1",
      ...overrides,
    });
    const { result } = renderHook(() => useInventoryAdjustment());

    act(() => {
      result.current.handleBarcodeChange({ target: { value: "COD-1" } });
    });
    act(() => {
      result.current.handleLookup();
    });

    expect(result.current.selectedProduct).toBeNull();
    expect(result.current.appModal.isOpen).toBe(true);
    expect(result.current.appModal.title).toBe("Producto sin inventario");
  });

  it("selecciona un producto con inventario capturado por codigo de barras", () => {
    const product = { id: "p1", codigo: "COD-1", tracks_inventory: true };
    productsState.getProductByCodigo.mockReturnValue(product);
    const { result } = renderHook(() => useInventoryAdjustment());

    act(() => {
      result.current.handleBarcodeChange({ target: { value: "COD-1" } });
    });
    act(() => {
      result.current.handleLookup();
    });

    expect(result.current.selectedProduct).toBe(product);
  });

  it.each([
    ["un kit", { is_kit: true }],
    ["un producto sin inventario", { tracks_inventory: false }],
  ])("rechaza %s cargado desde el buscador", (_label, overrides) => {
    const { result } = renderHook(() => useInventoryAdjustment());

    act(() => {
      result.current.loadProduct({ id: "p1", codigo: "COD-1", ...overrides });
    });

    expect(result.current.selectedProduct).toBeNull();
    expect(result.current.appModal.title).toBe("Producto sin inventario");
  });

  it("carga desde el buscador un producto con inventario", () => {
    const product = { id: "p1", codigo: "COD-1", tracks_inventory: true };
    const { result } = renderHook(() => useInventoryAdjustment());

    act(() => {
      result.current.loadProduct(product);
    });

    expect(result.current.selectedProduct).toBe(product);
    expect(result.current.barcode).toBe("COD-1");
  });
});
