import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { rpc: rpcMock },
}));

import { fetchProductBranchInsights } from "./productInsightsDetailService";

describe("fetchProductBranchInsights", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("llama al RPC con producto y rango en ISO", async () => {
    const rows = [{ branch_id: "b1" }];
    rpcMock.mockResolvedValue({ data: rows, error: null });

    const dateFrom = new Date(2026, 9, 1, 0, 0, 0, 0);
    const dateTo = new Date(2026, 9, 15, 23, 59, 59, 999);

    await expect(
      fetchProductBranchInsights({ productId: "p1", dateFrom, dateTo })
    ).resolves.toBe(rows);

    expect(rpcMock).toHaveBeenCalledWith("get_product_branch_insights", {
      p_product_id: "p1",
      p_from: dateFrom.toISOString(),
      p_to: dateTo.toISOString(),
    });
  });

  it("rechaza parametros incompletos sin consultar", async () => {
    await expect(
      fetchProductBranchInsights({
        productId: "",
        dateFrom: null,
        dateTo: null,
      })
    ).rejects.toThrow("Parámetros de consulta incompletos.");

    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("propaga el error del RPC", async () => {
    const failure = new Error("rpc fallo");
    rpcMock.mockResolvedValue({ data: null, error: failure });

    await expect(
      fetchProductBranchInsights({
        productId: "p1",
        dateFrom: new Date(),
        dateTo: new Date(),
      })
    ).rejects.toBe(failure);
  });
});
