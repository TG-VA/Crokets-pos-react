import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

vi.mock(
  "../components/InventoryComponents/PageInventory/PageOrders/services/ordersService",
  () => ({
    countPendingStoreOrders: vi.fn(),
    loadStoreOrders: vi.fn(),
  })
);

let mockRealtimeOnChange = null;
let mockRealtimeFilters = null;
const mockUnsubscribe = vi.fn();

vi.mock("../services/inventory/ordersRealtimeService", () => ({
  subscribeToStoreOrderChanges: ({ onChange, filters }) => {
    mockRealtimeFilters = filters;
    mockRealtimeOnChange = onChange;
    return mockUnsubscribe;
  },
}));

let mockBranch = { id: "branch-1" };

vi.mock("./BranchContext", () => ({
  useBranch: () => ({ branch: mockBranch }),
  BranchProvider: ({ children }) => <>{children}</>,
}));

import {
  countPendingStoreOrders,
  loadStoreOrders,
} from "../components/InventoryComponents/PageInventory/PageOrders/services/ordersService";
import {
  PendingOrdersProvider,
  usePendingOrders,
} from "./PendingOrdersContext";

const Consumer = () => {
  const { pendingOrdersCount, isLoading, lastRefreshAt } = usePendingOrders();

  return (
    <div>
      <span data-testid="count">{pendingOrdersCount}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="last-refresh">{lastRefreshAt ? "set" : "null"}</span>
    </div>
  );
};

const renderProvider = () =>
  render(
    <PendingOrdersProvider>
      <Consumer />
    </PendingOrdersProvider>
  );

describe("PendingOrdersContext - refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBranch = { id: "branch-1" };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("no consulta y deja el badge en 0 cuando no hay sucursal activa", async () => {
    mockBranch = { id: "" };

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(countPendingStoreOrders).not.toHaveBeenCalled();
    expect(screen.getByTestId("count").textContent).toBe("0");
    expect(screen.getByTestId("last-refresh").textContent).toBe("null");
  });

  it("pide solo el conteo de pendientes de la sucursal activa", async () => {
    countPendingStoreOrders.mockResolvedValue(4);

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("4");
    });

    expect(countPendingStoreOrders).toHaveBeenCalledTimes(1);
    expect(countPendingStoreOrders).toHaveBeenCalledWith("branch-1");
    expect(loadStoreOrders).not.toHaveBeenCalled();
    expect(screen.getByTestId("last-refresh").textContent).toBe("set");
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  it("el polling de 30 s vuelve a pedir solo el conteo, no el historial", async () => {
    vi.useFakeTimers();
    countPendingStoreOrders.mockResolvedValue(2);

    renderProvider();

    await act(async () => {
      await Promise.resolve();
    });

    expect(countPendingStoreOrders).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("count").textContent).toBe("2");

    await act(async () => {
      vi.advanceTimersByTime(30 * 1000);
    });

    expect(countPendingStoreOrders).toHaveBeenCalledTimes(2);
    expect(countPendingStoreOrders).toHaveBeenLastCalledWith("branch-1");
    expect(loadStoreOrders).not.toHaveBeenCalled();
  });

  it("refresca el conteo al recibir un cambio realtime de pedidos", async () => {
    countPendingStoreOrders.mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1");
    });

    await act(async () => {
      mockRealtimeOnChange();
    });

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("2");
    });
  });

  it("agrupa una rafaga de eventos realtime en una sola consulta", async () => {
    countPendingStoreOrders.mockResolvedValue(1);

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    vi.useFakeTimers();
    countPendingStoreOrders.mockClear();

    await act(async () => {
      mockRealtimeOnChange();
      mockRealtimeOnChange();
      mockRealtimeOnChange();
      vi.advanceTimersByTime(500);
    });

    expect(countPendingStoreOrders).toHaveBeenCalledTimes(1);
  });

  it("no vuelve a marcar isLoading en refrescos posteriores a la primera carga", async () => {
    let resolveSecond;

    countPendingStoreOrders.mockResolvedValueOnce(1).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSecond = resolve;
      })
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    vi.useFakeTimers();

    await act(async () => {
      mockRealtimeOnChange();
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("loading").textContent).toBe("false");

    await act(async () => {
      resolveSecond(2);
    });

    expect(screen.getByTestId("count").textContent).toBe("2");
  });

  it("solo observa los pedidos dirigidos a la sucursal activa", async () => {
    countPendingStoreOrders.mockResolvedValue(0);

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(mockRealtimeFilters).toEqual(["to_branch_id=eq.branch-1"]);
  });

  it("cierra la suscripcion realtime al desmontar", async () => {
    countPendingStoreOrders.mockResolvedValue(0);

    const { unmount } = renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("no registra console.error ante un fallo de red", async () => {
    countPendingStoreOrders.mockRejectedValue(new TypeError("Failed to fetch"));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("ignora el error de schema ausente (migracion no aplicada)", async () => {
    const schemaError = Object.assign(new Error("not found"), {
      code: "PGRST205",
      status: 404,
    });

    countPendingStoreOrders.mockRejectedValue(schemaError);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("registra console.error ante un error de negocio y mantiene el conteo", async () => {
    countPendingStoreOrders.mockRejectedValue(new Error("permiso denegado"));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderProvider();

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        "Error al refrescar pedidos pendientes:",
        expect.any(Error)
      );
    });

    expect(screen.getByTestId("count").textContent).toBe("0");
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });
});
