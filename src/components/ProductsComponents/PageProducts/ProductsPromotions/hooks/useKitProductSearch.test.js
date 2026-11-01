import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useKitProductSearch } from "./useKitProductSearch";

const mockFetchMissing = vi.hoisted(() => vi.fn());

vi.mock("../services/kitBranchCoverageService", () => ({
  fetchMissingBranchesForProduct: mockFetchMissing,
}));
vi.mock("../services/productKitsService", () => ({
  fetchActiveNonKitProducts: vi.fn().mockResolvedValue([]),
}));

const setup = () => {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectProduct: vi.fn(),
    showAppAlert: vi.fn(),
    appModalIsOpen: false,
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
