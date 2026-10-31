import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ result: { data: [], error: null } }));

vi.mock("../../../../../lib/supabaseClient", () => {
  const chain = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.limit = vi.fn(() => Promise.resolve(mocks.result));

  return { supabase: { from: vi.fn(() => chain), chain } };
});

import { supabase } from "../../../../../lib/supabaseClient";
import { fetchLocalProductsCatalog } from "./localProductsCatalogService";

describe("fetchLocalProductsCatalog", () => {
  beforeEach(() => {
    mocks.result = { data: [], error: null };
  });

  it("consulta inventario de productos locales activos y los agrupa", async () => {
    mocks.result = {
      data: [
        {
          products: { id: "p1", name: "x", is_global: false },
          branches: { name: "Centro" },
        },
      ],
      error: null,
    };

    const result = await fetchLocalProductsCatalog();

    expect(supabase.from).toHaveBeenCalledWith("branch_inventory");
    expect(supabase.chain.eq).toHaveBeenCalledWith("products.is_global", false);
    expect(supabase.chain.eq).toHaveBeenCalledWith("products.status", true);
    expect(result[0].localBranchNames).toEqual(["Centro"]);
  });

  it("propaga el error de la consulta", async () => {
    const failure = new Error("fallo");
    mocks.result = { data: null, error: failure };

    await expect(fetchLocalProductsCatalog()).rejects.toBe(failure);
  });
});
