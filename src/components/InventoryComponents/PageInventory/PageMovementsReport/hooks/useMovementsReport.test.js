import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const { loadMovementBranches, loadMovementsReport } = vi.hoisted(() => ({
  loadMovementBranches: vi.fn(),
  loadMovementsReport: vi.fn(),
}));

vi.mock("../../../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "b1", name: "Torres", code: "" } }),
}));

vi.mock("../services/movementsReportService", () => ({
  POLI_BRANCH_ID: "poli",
  loadMovementBranches,
  loadMovementsReport,
}));

import useMovementsReport from "./useMovementsReport";

describe("useMovementsReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadMovementBranches.mockResolvedValue([{ id: "b1", name: "Torres" }]);
    loadMovementsReport.mockResolvedValue([{ id: "m1" }]);
  });

  it("pide el reporte con la sucursal y el rango de fechas", async () => {
    const { result } = renderHook(() => useMovementsReport());

    await waitFor(() => expect(result.current.rows).toHaveLength(1));

    expect(loadMovementsReport).toHaveBeenCalledWith({
      branchId: "b1",
      startDateKey: result.current.startDateKey,
      endDateKey: result.current.endDateKey,
    });
    expect(result.current.rows).toEqual([{ id: "m1" }]);
  });

  it("vuelve a pedir datos al cambiar el rango de fechas", async () => {
    const { result } = renderHook(() => useMovementsReport());

    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    loadMovementsReport.mockClear();

    act(() => {
      result.current.handleStartDateChange(new Date(2025, 0, 5));
    });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(loadMovementsReport).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: "b1", startDateKey: "2025-01-05" })
    );
  });
});
