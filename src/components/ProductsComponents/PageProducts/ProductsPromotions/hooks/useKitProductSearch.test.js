import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useKitProductSearch } from "./useKitProductSearch";

const mockFetchMissing = vi.hoisted(() => vi.fn());
const mockFetchProducts = vi.hoisted(() => vi.fn());

vi.mock("../services/kitBranchCoverageService", () => ({
  fetchMissingBranchesForProduct: mockFetchMissing,
}));
vi.mock("../services/productKitsService", () => ({
  fetchActiveNonKitProducts: mockFetchProducts,
}));

const setup = (extraProps = {}) => {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectProduct: vi.fn(),
    showAppAlert: vi.fn(),
    appModalIsOpen: false,
    ...extraProps,
  };
  const hook = renderHook(() => useKitProductSearch(props));
  return { props, hook };
};

describe("useKitProductSearch aviso de producto local", () => {
  beforeEach(() => {
    mockFetchMissing.mockReset();
  });

  it("expone handleSelect y avisa sucursales faltantes en productos locales", async () => {
    mockFetchMissing.mockResolvedValue([{ id: 2, name: "Norte" }]);
    const { props, hook } = setup();
    expect(hook.result.current.handleSelect).toBeTypeOf("function");

    act(() =>
      hook.result.current.handleSelect({
        id: 9,
        name: "ALIMENTO",
        is_global: false,
      })
    );

    await waitFor(() => expect(props.showAppAlert).toHaveBeenCalledTimes(1));
    expect(props.onSelectProduct).toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalled();
    expect(mockFetchMissing).toHaveBeenCalledWith(9);
  });

  it("pasa las sucursales faltantes como datos en branches del aviso", async () => {
    const missing = [
      { id: 2, name: "Norte" },
      { id: 3, name: "Coba" },
    ];
    mockFetchMissing.mockResolvedValue(missing);
    const { props, hook } = setup();

    act(() =>
      hook.result.current.handleSelect({
        id: 9,
        name: "ALIMENTO",
        is_global: false,
      })
    );

    await waitFor(() => expect(props.showAppAlert).toHaveBeenCalledTimes(1));
    const alert = props.showAppAlert.mock.calls[0][0];
    expect(alert.branches).toEqual(missing);
    expect(alert.children).toBeUndefined();
  });

  it("no consulta cobertura en productos globales", async () => {
    const { props, hook } = setup();
    act(() =>
      hook.result.current.handleSelect({
        id: 3,
        name: "GLOBAL",
        is_global: true,
      })
    );
    expect(props.onSelectProduct).toHaveBeenCalled();
    expect(mockFetchMissing).not.toHaveBeenCalled();
    expect(props.showAppAlert).not.toHaveBeenCalled();
  });

  it("no avisa si el producto local cubre todas las sucursales", async () => {
    mockFetchMissing.mockResolvedValue([]);
    const { props, hook } = setup();
    act(() =>
      hook.result.current.handleSelect({
        id: 4,
        name: "LOCAL",
        is_global: false,
      })
    );
    await waitFor(() => expect(mockFetchMissing).toHaveBeenCalledWith(4));
    expect(props.showAppAlert).not.toHaveBeenCalled();
  });
});

describe("useKitProductSearch productos ya agregados", () => {
  const products = [
    { id: 10, name: "ALIMENTO A", is_global: true },
    { id: 12, name: "ALIMENTO B", is_global: true },
    { id: 14, name: "ALIMENTO C", is_global: true },
  ];

  beforeEach(() => {
    mockFetchMissing.mockReset();
    mockFetchProducts.mockReset();
    mockFetchProducts.mockResolvedValue(products);
  });

  const search = async (hook) => {
    await act(() => hook.result.current.searchProducts("alimento"));
  };

  const pressKey = (key) =>
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key }));
    });

  it("handleSelect ignora un producto que ya esta en el kit", () => {
    const { props, hook } = setup({ addedProductIds: [12] });
    act(() => hook.result.current.handleSelect(products[1]));
    expect(props.onSelectProduct).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("la seleccion inicial salta el primer resultado ya agregado", async () => {
    const { hook } = setup({ addedProductIds: [10] });
    await search(hook);
    expect(hook.result.current.selectedIndex).toBe(1);
  });

  it("ArrowDown se salta los productos ya agregados", async () => {
    const { props, hook } = setup({ addedProductIds: [12] });
    await search(hook);
    expect(hook.result.current.selectedIndex).toBe(0);
    pressKey("ArrowDown");
    expect(hook.result.current.selectedIndex).toBe(2);
    pressKey("Enter");
    expect(props.onSelectProduct).toHaveBeenCalledWith(products[2]);
  });
});
