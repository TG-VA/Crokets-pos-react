import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "../../../../../lib/supabaseClient";
import { fetchMissingBranchesForProduct } from "./kitBranchCoverageService";

const branchesQuery = (data) => {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn().mockResolvedValue({ data, error: null }),
  };
  return query;
};

const inventoryQuery = (data) => {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn().mockResolvedValue({ data, error: null }),
  };
  return query;
};

describe("fetchMissingBranchesForProduct", () => {
  beforeEach(() => supabase.from.mockReset());

  it("calcula la cobertura solo contra sucursales operativas activas", async () => {
    const branches = branchesQuery([
      { id: "b1", name: "Centro" },
      { id: "b2", name: "Norte" },
    ]);
    supabase.from.mockImplementation((table) =>
      table === "branches"
        ? branches
        : inventoryQuery([{ branch_id: "b1", is_active: true }])
    );

    const missing = await fetchMissingBranchesForProduct("p1");

    expect(branches.eq).toHaveBeenCalledWith("branch_type", "operational");
    expect(branches.eq).toHaveBeenCalledWith("is_active", true);
    expect(missing).toEqual([{ id: "b2", name: "Norte" }]);
  });
});
