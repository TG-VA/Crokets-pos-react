import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock(
  "../../../../../services/supabase/paginatedQuery",
  async (importOriginal) => {
    const { withSmallPages } =
      await import("../../../../../services/supabase/fakePostgrest.testUtils");
    return withSmallPages(await importOriginal());
  }
);

import { supabase } from "../../../../../lib/supabaseClient";
import {
  buildId,
  createFakePostgrest,
} from "../../../../../services/supabase/fakePostgrest.testUtils";
import {
  fetchBranchNamesByProduct,
  fetchMissingBranchesForProduct,
} from "./kitBranchCoverageService";

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

describe("fetchBranchNamesByProduct", () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  it("lee todas las paginas de cada lote de productos", async () => {
    const branchNames = ["Centro", "Norte", "Sur", "Este"];
    const rows = ["p1", "p2", "p3"].flatMap((productId, productIndex) =>
      branchNames.map((name, branchIndex) => ({
        id: buildId("bi", productIndex * 10 + branchIndex),
        product_id: productId,
        is_active: true,
        branches: { name, is_active: true },
      }))
    );
    const fake = createFakePostgrest({ branch_inventory: rows });
    supabase.from.mockImplementation(fake.from);

    const names = await fetchBranchNamesByProduct(["p1", "p2", "p3"]);

    const sortedNames = [...branchNames].sort();
    expect(names).toEqual({
      p1: sortedNames,
      p2: sortedNames,
      p3: sortedNames,
    });
  });
});
