import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("../services/transfersService", () => ({
  cancelTransferOrder: vi.fn(),
  fetchTransferBranchOptions: vi.fn(),
  loadTransferOrders: vi.fn(),
}));

vi.mock("./useTransfersRealtime", () => ({
  default: vi.fn(() => {}),
}));

import {
  cancelTransferOrder,
  fetchTransferBranchOptions,
  loadTransferOrders,
} from "../services/transfersService";
import useTransferDataLoad from "./useTransferDataLoad";
import useTransfersRealtime from "./useTransfersRealtime";

const orders = [
  {
    id: "t1",
    folio: "TR-010126-000001",
    originBranchId: "b1",
    destinationBranchId: "b2",
    status: "pending_receipt",
    createdAt: "2026-10-01T10:00:00Z",
    receivedAt: null,
    totals: { requestedUnits: 10, receivedUnits: 0, returnedUnits: 0 },
    remainingUnits: 10,
  },
  {
    id: "t2",
    folio: "TR-010126-000002",
    originBranchId: "b2",
    destinationBranchId: "b1",
    status: "pending_receipt",
    createdAt: "2026-10-02T10:00:00Z",
    receivedAt: null,
    totals: { requestedUnits: 5, receivedUnits: 0, returnedUnits: 0 },
    remainingUnits: 5,
  },
];

const createProps = (overrides = {}) => ({
  branch: { id: "b1", name: "Origen" },
  user: { id: "u1", username: "admin" },
  isActive: false,
  refreshProducts: vi.fn().mockResolvedValue(),
  clearFeedback: vi.fn(),
  setSuccess: vi.fn(),
  setError: vi.fn(),
  ...overrides,
});

const setupMocks = () => {
  fetchTransferBranchOptions.mockResolvedValue([
    { id: "b1", name: "Origen", code: "ORG" },
    { id: "b2", name: "Destino", code: "DST" },
  ]);
  loadTransferOrders.mockResolvedValue(orders);
};

describe("useTransferDataLoad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inicializa activeTab en send", () => {
    setupMocks();
    const { result } = renderHook(() => useTransferDataLoad(createProps()));
    expect(result.current.activeTab).toBe("send");
  });

  it("carga sucursales y ordenes en el montaje", async () => {
    setupMocks();
    const { result } = renderHook(() => useTransferDataLoad(createProps()));
    await waitFor(() => {
      expect(result.current.branchOptions).toHaveLength(2);
    });
    expect(fetchTransferBranchOptions).toHaveBeenCalled();
    expect(loadTransferOrders).toHaveBeenCalled();
  });

  it("destinationOptions excluye la sucursal actual", async () => {
    setupMocks();
    const { result } = renderHook(() => useTransferDataLoad(createProps()));
    await waitFor(() => {
      expect(result.current.destinationOptions).toHaveLength(1);
    });
    expect(result.current.destinationOptions[0].id).toBe("b2");
  });

  it("destinationOptions excluye el origen elegido por una terminal admin", async () => {
    setupMocks();
    const { result } = renderHook(() =>
      useTransferDataLoad(
        createProps({
          branch: { id: "adm", branch_type: "admin" },
          originBranchId: "b2",
        })
      )
    );
    await waitFor(() => {
      expect(result.current.destinationOptions).toHaveLength(1);
    });
    expect(result.current.destinationOptions[0].id).toBe("b1");
  });

  it("pendingReceiptsCount cuenta solo pending_receipt de destino", async () => {
    setupMocks();
    const { result } = renderHook(() => useTransferDataLoad(createProps()));
    await waitFor(() => {
      expect(result.current.pendingReceiptsCount).toBe(1);
    });
  });

  it("handleTabChange cambia el tab activo", () => {
    const { result } = renderHook(() => useTransferDataLoad(createProps()));
    act(() => {
      result.current.handleTabChange("history");
    });
    expect(result.current.activeTab).toBe("history");
  });

  it("handleCancelTransfer cancela y recarga", async () => {
    setupMocks();
    cancelTransferOrder.mockResolvedValue({
      folio: "TR-010126-000001",
      originBranchName: "Origen",
    });
    const setSuccess = vi.fn();
    const { result } = renderHook(() =>
      useTransferDataLoad(createProps({ setSuccess }))
    );
    await waitFor(() => {
      expect(result.current.branchOptions).toHaveLength(2);
    });
    await act(async () => {
      await result.current.handleCancelTransfer("t1");
    });
    expect(cancelTransferOrder).toHaveBeenCalledWith({
      transferOrderId: "t1",
      currentBranch: { id: "b1", name: "Origen" },
      user: { id: "u1", username: "admin" },
    });
    await waitFor(() => {
      expect(setSuccess).toHaveBeenCalledWith(
        "Se canceló TR-010126-000001 y las piezas regresaron a Origen."
      );
    });
  });

  it("handleCancelTransfer lanza error si falla", async () => {
    cancelTransferOrder.mockRejectedValueOnce(new Error("No permitido"));
    const setError = vi.fn();
    const { result } = renderHook(() =>
      useTransferDataLoad(createProps({ setError }))
    );
    await expect(
      act(async () => {
        await result.current.handleCancelTransfer("t1");
      })
    ).rejects.toThrow("No permitido");
    expect(setError).toHaveBeenCalledWith("No permitido");
  });
});
