import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import useAdjustmentProductSelection from "./useAdjustmentProductSelection";

const PRODUCT = { id: "p1", codigo: "750", descripcion: "Croqueta" };

const setup = (catalog = {}) => {
  const showAppAlert = vi.fn();
  const getProductByCodigo = vi.fn((code) => catalog[code] ?? null);
  const hook = renderHook(() =>
    useAdjustmentProductSelection({ getProductByCodigo, showAppAlert })
  );

  return { ...hook, showAppAlert, getProductByCodigo };
};

const typeBarcode = (result, value) => {
  act(() => result.current.handleBarcodeChange({ target: { value } }));
};

describe("useAdjustmentProductSelection", () => {
  it("avisa si el codigo esta vacio sin consultar el catalogo", () => {
    const { result, showAppAlert, getProductByCodigo } = setup();

    typeBarcode(result, "   ");
    act(() => result.current.handleLookup());

    expect(getProductByCodigo).not.toHaveBeenCalled();
    expect(showAppAlert).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Código requerido" })
    );
  });

  it("avisa si el producto no existe", () => {
    const { result, showAppAlert } = setup();

    typeBarcode(result, "999");
    act(() => result.current.handleLookup());

    expect(result.current.selectedProduct).toBeNull();
    expect(showAppAlert).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Producto no encontrado" })
    );
  });

  it("selecciona el producto escaneado", () => {
    const { result, showAppAlert } = setup({ 750: PRODUCT });

    typeBarcode(result, " 750 ");
    act(() => result.current.handleLookup());

    expect(result.current.selectedProduct).toBe(PRODUCT);
    expect(result.current.barcode).toBe("750");
    expect(showAppAlert).not.toHaveBeenCalled();
  });

  it("rechaza kits y productos sin inventario desde F10", () => {
    const { result, showAppAlert } = setup();

    act(() => result.current.openSearchModal());
    act(() => result.current.loadProduct({ ...PRODUCT, is_kit: true }));
    act(() =>
      result.current.loadProduct({ ...PRODUCT, tracks_inventory: false })
    );

    expect(result.current.selectedProduct).toBeNull();
    expect(result.current.searchModalOpen).toBe(true);
    expect(showAppAlert).toHaveBeenCalledTimes(2);
  });

  it("ignora una seleccion vacia del buscador F10", () => {
    const { result, showAppAlert } = setup();

    act(() => result.current.openSearchModal());
    act(() => result.current.loadProduct(null));

    expect(showAppAlert).not.toHaveBeenCalled();
    expect(result.current.selectedProduct).toBeNull();
    expect(result.current.searchModalOpen).toBe(true);
  });

  it("carga desde F10 cerrando el buscador y limpia la seleccion", () => {
    const { result } = setup();

    act(() => result.current.openSearchModal());
    act(() => result.current.loadProduct(PRODUCT));

    expect(result.current.selectedProduct).toBe(PRODUCT);
    expect(result.current.searchModalOpen).toBe(false);

    act(() => result.current.clearSelection());

    expect(result.current.selectedProduct).toBeNull();
    expect(result.current.barcode).toBe("");
  });
});
