import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("../../../services/branchScopeService", () => ({
  fetchOperationalBranches: vi.fn(),
}));

import { supabase } from "../../../lib/supabaseClient";
import { fetchOperationalBranches } from "../../../services/branchScopeService";
import { fetchProductStocksAcrossBranches } from "./searchModalService";

const stockQuery = (data) => {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn().mockResolvedValue({ data, error: null }),
  };
  return query;
};

const stockRow = (branchId) => ({
  branch_id: branchId,
  stock: 4,
  is_active: true,
  has_been_stocked: true,
});

describe("fetchProductStocksAcrossBranches", () => {
  beforeEach(() => {
    supabase.from.mockReset();
    fetchOperationalBranches.mockReset();
  });

  it("solo ofrece stock de sucursales operativas", async () => {
    supabase.from.mockReturnValue(
      stockQuery([stockRow("b1"), stockRow("adm")])
    );
    fetchOperationalBranches.mockResolvedValue({
      data: [
        { id: "b1", code: "CTR", name: "Centro" },
        { id: "b2", code: "NTE", name: "Norte" },
      ],
      error: null,
    });

    const result = await fetchProductStocksAcrossBranches("p1");

    expect(result.validRows.map((row) => row.branch_id)).toEqual(["b1"]);
    expect(result.branchMap).toEqual({
      b1: { id: "b1", code: "CTR", name: "Centro" },
    });
  });

  it("propaga el error de la consulta de sucursales", async () => {
    supabase.from.mockReturnValue(stockQuery([stockRow("b1")]));
    fetchOperationalBranches.mockResolvedValue({
      data: [],
      error: new Error("boom"),
    });

    await expect(fetchProductStocksAcrossBranches("p1")).rejects.toThrow(
      "boom"
    );
  });

  it("no consulta sucursales si no hay stock valido", async () => {
    supabase.from.mockReturnValue(stockQuery([]));

    const result = await fetchProductStocksAcrossBranches("p1");

    expect(result).toEqual({ validRows: [], branchMap: {} });
    expect(fetchOperationalBranches).not.toHaveBeenCalled();
  });
});
