import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import useProductLookup from "./useProductLookup";

const products = [
  {
    id: "p1",
    codigo: "CROC-01",
    descripcion: "Croquetas Cachorro",
    departamento: "Alimentos",
    tracks_inventory: true,
    existencia: 10,
  },
  {
    id: "p2",
    codigo: "SHA-10",
    descripcion: "Shampoo Canino",
    departamento: "Higiene",
    tracks_inventory: true,
    existencia: 5,
  },
];

const createProps = (overrides = {}) => ({
  products,
  activeTab: "send",
  getProductByCodigo: vi.fn(),
  clearFeedback: vi.fn(),
  setError: vi.fn(),
  onProductSelected: vi.fn(),
  resetAfterSelection: vi.fn(),
  ...overrides,
});

describe("useProductLookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filtra productos con tracks_inventory=true aunque no tengan existencia", () => {
    const { result } = renderHook(() => useProductLookup(createProps()));
    expect(result.current.searchableProducts).toHaveLength(2);
  });

  it("excluye productos sin tracks_inventory pero conserva los agotados", () => {
    const localProducts = [
      ...products,
      {
        id: "p3",
        codigo: "GIFT-1",
        descripcion: "Giftcard",
        tracks_inventory: false,
        existencia: 5,
      },
      {
        id: "p4",
        codigo: "OUT-1",
        descripcion: "Agotado",
        tracks_inventory: true,
        existencia: 0,
      },
    ];
    const { result } = renderHook(() =>
      useProductLookup(createProps({ products: localProducts }))
    );
    expect(result.current.searchableProducts).toHaveLength(3);
    expect(
      result.current.searchableProducts.map((product) => product.id)
    ).toEqual(["p4", "p1", "p2"]);
  });

  it("handleLookupProduct: error si la busqueda esta vacia", () => {
    const setError = vi.fn();
    const { result } = renderHook(() =>
      useProductLookup(createProps({ setError, productSearch: "" }))
    );
    act(() => {
      result.current.handleLookupProduct();
    });
    expect(setError).toHaveBeenCalledWith(
      "Escanea o escribe un código, o presiona F10 para buscar."
    );
  });

  it("handleLookupProduct: selecciona por codigo exacto", () => {
    const getProductByCodigo = vi.fn().mockReturnValue(products[0]);
    const onProductSelected = vi.fn();
    const { result } = renderHook(() =>
      useProductLookup(
        createProps({
          getProductByCodigo,
          onProductSelected,
        })
      )
    );
    act(() => {
      result.current.setProductSearch("CROC-01");
    });
    act(() => {
      result.current.handleLookupProduct();
    });
    expect(onProductSelected).toHaveBeenCalledWith(products[0], 1);
  });

  it("handleLookupProduct: abre modal si hay multiples coincidencias parciales", () => {
    const setError = vi.fn();
    const { result } = renderHook(() =>
      useProductLookup(createProps({ setError }))
    );
    act(() => {
      result.current.setProductSearch("ca");
    });
    act(() => {
      result.current.handleLookupProduct();
    });
    expect(result.current.searchModalOpen).toBe(true);
  });

  it("handleLookupProduct: error si no hay coincidencias", () => {
    const setError = vi.fn();
    const { result } = renderHook(() =>
      useProductLookup(createProps({ setError }))
    );
    act(() => {
      result.current.setProductSearch("zzz-no-existe");
    });
    act(() => {
      result.current.handleLookupProduct();
    });
    expect(setError).toHaveBeenCalledWith(
      "No se encontró un producto con ese código. Presiona F10 para buscarlo."
    );
  });

  it("openSearchModal / closeSearchModal controlan el modal", () => {
    const { result } = renderHook(() => useProductLookup(createProps()));
    expect(result.current.searchModalOpen).toBe(false);
    act(() => {
      result.current.openSearchModal();
    });
    expect(result.current.searchModalOpen).toBe(true);
    act(() => {
      result.current.closeSearchModal();
    });
    expect(result.current.searchModalOpen).toBe(false);
  });

  it("clearLookupSelection limpia la busqueda", () => {
    const { result } = renderHook(() => useProductLookup(createProps()));
    act(() => {
      result.current.setProductSearch("CROC-01");
    });
    expect(result.current.productSearch).toBe("CROC-01");
    act(() => {
      result.current.clearLookupSelection();
    });
    expect(result.current.productSearch).toBe("");
  });

  it("loadProductForTransfer selecciona el producto", () => {
    const onProductSelected = vi.fn();
    const { result } = renderHook(() =>
      useProductLookup(createProps({ onProductSelected }))
    );
    act(() => {
      result.current.loadProductForTransfer(products[0]);
    });
    expect(onProductSelected).toHaveBeenCalledWith(products[0], 1);
  });

  it("loadProductForTransfer no hace nada si no hay producto", () => {
    const onProductSelected = vi.fn();
    const { result } = renderHook(() =>
      useProductLookup(createProps({ onProductSelected }))
    );
    act(() => {
      result.current.loadProductForTransfer(null);
    });
    expect(onProductSelected).not.toHaveBeenCalled();
  });
});
