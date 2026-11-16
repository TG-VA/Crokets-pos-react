import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const branchState = vi.hoisted(() => ({ current: null }));

vi.mock("../../../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: branchState.current }),
}));

vi.mock("../../../../../lib/supabaseClient", () => {
  const channel = {
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => channel),
  };
  return {
    supabase: {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock("../services/inventoryReportService", () => ({
  fetchBranchOptions: vi.fn(),
  fetchInventoryReportRows: vi.fn(),
  getBranchOptionsFallback: vi.fn(() => []),
}));

import useInventoryReport from "./useInventoryReport";
import {
  fetchBranchOptions,
  fetchInventoryReportRows,
} from "../services/inventoryReportService";

describe("useInventoryReport sucursal inicial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchBranchOptions.mockResolvedValue([{ id: "b1", name: "Centro" }]);
    fetchInventoryReportRows.mockResolvedValue([{ id: "r1" }]);
  });

  it("una terminal admin no preselecciona sucursal ni consulta inventario", async () => {
    branchState.current = { id: "adm", branch_type: "admin" };

    const { result } = renderHook(() => useInventoryReport());

    await waitFor(() => expect(fetchBranchOptions).toHaveBeenCalled());
    expect(result.current.selectedBranchId).toBe("");
    expect(result.current.rows).toEqual([]);
    expect(fetchInventoryReportRows).not.toHaveBeenCalled();

    act(() => result.current.handleBranchChange("b1"));

    expect(result.current.selectedBranchId).toBe("b1");
    await waitFor(() =>
      expect(fetchInventoryReportRows).toHaveBeenCalledWith("b1")
    );
  });

  it("una terminal operativa preselecciona su sucursal", async () => {
    branchState.current = { id: "b1", branch_type: "operational" };

    const { result } = renderHook(() => useInventoryReport());

    expect(result.current.selectedBranchId).toBe("b1");
    await waitFor(() =>
      expect(fetchInventoryReportRows).toHaveBeenCalledWith("b1")
    );
    await waitFor(() => expect(result.current.rows).toEqual([{ id: "r1" }]));
  });
});
