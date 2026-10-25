import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock(
  "../components/InventoryComponents/PageInventory/PageOrders/services/ordersService",
  () => ({
    countPendingStoreOrders: vi.fn(),
  })
);

let mockBranch = { id: "branch-1" };

vi.mock("./BranchContext", () => ({
  useBranch: () => ({ branch: mockBranch }),
  BranchProvider: ({ children }) => <>{children}</>,
}));

import { countPendingStoreOrders } from "../components/InventoryComponents/PageInventory/PageOrders/services/ordersService";
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
    expect(screen.getByTestId("last-refresh").textContent).toBe("set");
    expect(screen.getByTestId("loading").textContent).toBe("false");
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
