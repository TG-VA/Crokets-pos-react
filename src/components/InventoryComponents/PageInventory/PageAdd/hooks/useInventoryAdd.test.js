import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../../../../../contexts/ProductsContext", () => ({
  useProducts: vi.fn(),
}));

vi.mock("../../../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "branch-1" } }),
}));

vi.mock("../services/inventoryAddService", async (importOriginal) => {
  const actual = await importOriginal();

  return { ...actual, addInventoryToProduct: vi.fn() };
});

import { useProducts } from "../../../../../contexts/ProductsContext";
import { addInventoryToProduct } from "../services/inventoryAddService";
import { ENTRY_MODE } from "../services/inventoryAddProjectionService";
import useInventoryAdd from "./useInventoryAdd";

const product = {
  product_id: "prod-1",
  codigo: "7501",
  descripcion: "Alimento",
  existencia: 10,
  costo: 100,
  precio: 250,
};

const grantError = {
  code: "42501",
  hint: "ADMIN_GRANT_REQUIRED",
  message: "Agregar inventario requiere la autorizacion de un administrador.",
};

const savedResult = {
  productId: "prod-1",
  previousStock: 10,
  newStock: 12,
  quantity: 2,
  previousCostPrice: 100,
  costPrice: 100,
};

const renderReadyHook = () => {
  const view = renderHook(() => useInventoryAdd());

  act(() => {
    view.result.current.loadProduct(product);
  });
  act(() => {
    view.result.current.costEntry.setEntryMode(ENTRY_MODE.MANUAL);
    view.result.current.handleQuantityChange({ target: { value: "2" } });
  });

  return view;
};

describe("useInventoryAdd: autorizacion vencida", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    addInventoryToProduct.mockReset();
    useProducts.mockReturnValue({
      products: [product],
      loadingProducts: false,
      productsError: null,
      getProductByCodigo: vi.fn(),
      refreshProducts: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("vuelve a pedir autorizacion sin perder la captura", async () => {
    addInventoryToProduct.mockRejectedValueOnce(grantError);
    const { result } = renderReadyHook();

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.reauthorizationOpen).toBe(true);
    expect(result.current.appModal.isOpen).toBe(false);
    expect(result.current.selectedProduct).toEqual(product);
    expect(result.current.quantityToAdd).toBe("2");
    expect(result.current.branchId).toBe("branch-1");
  });

  it("reintenta el alta al autorizar de nuevo", async () => {
    addInventoryToProduct
      .mockRejectedValueOnce(grantError)
      .mockResolvedValueOnce(savedResult);
    const { result } = renderReadyHook();

    await act(async () => {
      await result.current.handleSubmit();
    });
    await act(async () => {
      await result.current.handleReauthorized();
    });

    expect(addInventoryToProduct).toHaveBeenCalledTimes(2);
    expect(result.current.reauthorizationOpen).toBe(false);
    expect(result.current.appModal.title).toBe("Inventario actualizado");
  });

  it("cerrar sin autorizar conserva la captura y no reintenta", async () => {
    addInventoryToProduct.mockRejectedValueOnce(grantError);
    const { result } = renderReadyHook();

    await act(async () => {
      await result.current.handleSubmit();
    });
    act(() => {
      result.current.closeReauthorization();
    });

    expect(result.current.reauthorizationOpen).toBe(false);
    expect(addInventoryToProduct).toHaveBeenCalledTimes(1);
    expect(result.current.selectedProduct).toEqual(product);
  });

  it("otros 42501 se muestran como error y no piden autorizacion", async () => {
    addInventoryToProduct.mockRejectedValueOnce({
      code: "42501",
      message: "No tienes acceso a esta sucursal.",
    });
    const { result } = renderReadyHook();

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.reauthorizationOpen).toBe(false);
    expect(result.current.appModal.message).toBe(
      "No tienes acceso a esta sucursal."
    );
  });
});
