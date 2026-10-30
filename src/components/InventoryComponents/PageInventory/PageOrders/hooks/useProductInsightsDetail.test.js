import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ fetchInsights: vi.fn() }));

vi.mock("../services/productInsightsDetailService", () => ({
  fetchProductBranchInsights: mocks.fetchInsights,
}));

import { useProductInsightsDetail } from "./useProductInsightsDetail";

const row = {
  branch_id: "b1",
  branch_name: "Centro",
  stock: 4,
  min_stock: 5,
  units_sold: 3,
  revenue: 90,
};

describe("useProductInsightsDetail", () => {
  beforeEach(() => {
    mocks.fetchInsights.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("carga la semana por defecto y calcula totales", async () => {
    mocks.fetchInsights.mockResolvedValue([row]);

    const { result } = renderHook(() =>
      useProductInsightsDetail({ productId: "p1" })
    );

    expect(result.current.preset).toBe("week");
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows[0].belowMinimum).toBe(true);
    expect(result.current.totals).toEqual({
      stock: 4,
      unitsSold: 3,
      revenue: 90,
    });
    expect(mocks.fetchInsights).toHaveBeenCalledWith(
      expect.objectContaining({ productId: "p1" })
    );
  });

  it("consulta de nuevo al elegir quincena", async () => {
    mocks.fetchInsights.mockResolvedValue([row]);

    const { result } = renderHook(() =>
      useProductInsightsDetail({ productId: "p1" })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.selectPreset("fortnight"));

    expect(result.current.preset).toBe("fortnight");
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const lastCall = mocks.fetchInsights.mock.calls.at(-1)[0];
    expect([1, 16]).toContain(lastCall.dateFrom.getDate());
  });

  it("no consulta con rango invalido y marca custom al editar fechas", async () => {
    mocks.fetchInsights.mockResolvedValue([row]);

    const { result } = renderHook(() =>
      useProductInsightsDetail({ productId: "p1" })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callsBefore = mocks.fetchInsights.mock.calls.length;

    act(() => result.current.changeDate("dateTo", null));

    expect(result.current.preset).toBe("custom");
    expect(result.current.isRangeValid).toBe(false);
    expect(mocks.fetchInsights.mock.calls.length).toBe(callsBefore);
  });

  it("expone un mensaje y conserva console.error cuando falla", async () => {
    mocks.fetchInsights.mockRejectedValue(new Error("fallo"));

    const { result } = renderHook(() =>
      useProductInsightsDetail({ productId: "p1" })
    );

    await waitFor(() => expect(result.current.error).not.toBe(""));

    expect(result.current.error).toBe(
      "No se pudo cargar el detalle del producto."
    );
    expect(console.error).toHaveBeenCalled();
  });
});
