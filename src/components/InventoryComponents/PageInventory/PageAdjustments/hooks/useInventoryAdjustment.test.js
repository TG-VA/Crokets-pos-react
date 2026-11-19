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

vi.mock("../services/inventoryAdjustmentService", () => ({
  applyInventoryAdjustment: vi.fn(),
  isAdminGrantRequiredError: (error) => error?.code === "42501",
}));

import { applyInventoryAdjustment } from "../services/inventoryAdjustmentService";
import useInventoryAdjustment from "./useInventoryAdjustment";

const grantError = {
  code: "42501",
  hint: "ADMIN_GRANT_REQUIRED",
  message: "Ajustar inventario requiere la autorizacion de un administrador.",
};

const renderWithCapture = () => {
  const product = { id: "p1", codigo: "COD-1", tracks_inventory: true };
  const hook = renderHook(() => useInventoryAdjustment());

  act(() => {
    hook.result.current.loadProduct(product);
  });
  act(() => {
    hook.result.current.handleQuantityChange({ target: { value: "-2" } });
    hook.result.current.handleReasonChange({ target: { value: "Merma" } });
  });

  return hook;
};

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

  it("pide reautorizar sin perder la captura cuando la autorizacion vencio", async () => {
    applyInventoryAdjustment.mockReset();
    applyInventoryAdjustment.mockRejectedValueOnce(grantError);
    const { result } = renderWithCapture();

    await act(async () => {
      await result.current.handleSubmitAdjustment();
    });

    expect(result.current.reauthorizationOpen).toBe(true);
    expect(result.current.appModal.isOpen).toBe(false);
    expect(result.current.quantityToAdjust).toBe("-2");
    expect(result.current.adjustmentReason).toBe("Merma");
  });

  it("reintenta el ajuste al reautorizar", async () => {
    applyInventoryAdjustment.mockReset();
    applyInventoryAdjustment
      .mockRejectedValueOnce(grantError)
      .mockResolvedValueOnce({ newStock: 3 });
    const { result } = renderWithCapture();

    await act(async () => {
      await result.current.handleSubmitAdjustment();
    });
    await act(async () => {
      result.current.handleReauthorized();
    });

    expect(applyInventoryAdjustment).toHaveBeenCalledTimes(2);
    expect(applyInventoryAdjustment).toHaveBeenLastCalledWith(
      expect.objectContaining({ quantity: -2, reason: "Merma" })
    );
    expect(result.current.reauthorizationOpen).toBe(false);
    expect(result.current.appModal.title).toBe("Inventario ajustado");
  });

  it("limpia la seleccion y cierra el buscador despues de guardar", async () => {
    applyInventoryAdjustment.mockReset();
    applyInventoryAdjustment.mockResolvedValueOnce({ newStock: 3 });
    const { result } = renderWithCapture();
    act(() => {
      result.current.openSearchModal();
    });

    await act(async () => {
      await result.current.handleSubmitAdjustment();
    });

    expect(result.current.selectedProduct).toBeNull();
    expect(result.current.barcode).toBe("");
    expect(result.current.searchModalOpen).toBe(false);
    expect(result.current.quantityToAdjust).toBe("");
  });

  it("limpia la seleccion y cierra el buscador al cancelar", () => {
    const { result } = renderWithCapture();
    act(() => {
      result.current.openSearchModal();
    });

    act(() => {
      result.current.cancelCurrentOperation();
    });

    expect(result.current.selectedProduct).toBeNull();
    expect(result.current.barcode).toBe("");
    expect(result.current.searchModalOpen).toBe(false);
    expect(result.current.quantityToAdjust).toBe("");
  });

  it.each([
    ["NEGATIVE_STOCK", "Stock insuficiente"],
    ["INVENTORY_NOT_REGISTERED", "Inventario no registrado"],
  ])("muestra un aviso especifico para el error %s", async (code, title) => {
    applyInventoryAdjustment.mockReset();
    applyInventoryAdjustment.mockRejectedValueOnce({
      code,
      message: "Detalle",
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderWithCapture();

    await act(async () => {
      await result.current.handleSubmitAdjustment();
    });

    expect(result.current.appModal.type).toBe("warning");
    expect(result.current.appModal.title).toBe(title);
    expect(result.current.appModal.message).toBe("Detalle");
    console.error.mockRestore();
  });
});
