import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  loadStoreOrders: vi.fn(),
  fetchOrderBranchOptions: vi.fn(),
  subscribe: vi.fn(() => () => {}),
  refreshPendingOrders: vi.fn(),
  branchContext: { branch: { id: "b1" } },
}));

vi.mock("../../../../../contexts/BranchContext", () => ({
  useBranch: () => mocks.branchContext,
}));
vi.mock("../../../../../contexts/PendingOrdersContext", () => ({
  usePendingOrders: () => ({
    refreshPendingOrders: mocks.refreshPendingOrders,
  }),
}));
vi.mock("../services/ordersService", () => ({
  loadStoreOrders: mocks.loadStoreOrders,
  fetchOrderBranchOptions: mocks.fetchOrderBranchOptions,
}));
vi.mock("../../../../../services/inventory/ordersRealtimeService", () => ({
  subscribeToStoreOrderChanges: mocks.subscribe,
}));

import { useOrdersData } from "./useOrdersData";

const buildOrder = (id) => ({
  id,
  order_name: `PEDIDO ${id}`,
  status: "pending",
  created_at: "2026-10-25T10:00:00Z",
  items: [],
});

const deferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe("useOrdersData", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.loadStoreOrders.mockReset();
    mocks.fetchOrderBranchOptions.mockReset().mockResolvedValue([]);
    mocks.refreshPendingOrders.mockReset();
  });

  it("descarta una respuesta vieja que llega despues de una recarga mas reciente", async () => {
    const stale = deferred();

    mocks.loadStoreOrders
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValueOnce([buildOrder("new")]);

    const { result } = renderHook(() => useOrdersData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let first;
    await act(async () => {
      first = result.current.refreshData({ showLoader: false });
    });
    await act(async () => {
      await result.current.refreshData({ showLoader: false });
    });

    await waitFor(() => expect(result.current.orders).toHaveLength(1));

    await act(async () => {
      stale.resolve([buildOrder("old-a"), buildOrder("old-b")]);
      await first;
    });

    expect(result.current.orders.map((order) => order.id)).toEqual(["new"]);
  });

  it("no reemplaza la vista por un error cuando falla una recarga silenciosa", async () => {
    mocks.loadStoreOrders
      .mockResolvedValueOnce([buildOrder("a")])
      .mockRejectedValueOnce(new Error("network"));

    const { result } = renderHook(() => useOrdersData());

    await waitFor(() => expect(result.current.orders).toHaveLength(1));

    await act(async () => {
      await result.current.refreshData({ showLoader: false });
    });

    expect(result.current.error).toBe("");
    expect(result.current.orders).toHaveLength(1);
  });
});
