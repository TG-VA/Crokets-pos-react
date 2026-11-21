import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { fetchLocalProductsCatalog } from "./localProductsCatalogService";

/*
  El doble corta cada respuesta en 2 filas, como PostgREST con max-rows: el
  .limit(5000) anterior nunca pasaba de la primera pagina.
*/

const buildProduct = (index, overrides = {}) => ({
  id: buildId("p", index),
  name: `Producto ${index}`,
  is_global: false,
  is_kit: false,
  status: true,
  ...overrides,
});

const buildRow = (index, product, branchName) => ({
  id: buildId("bi", index),
  product_id: product.id,
  branches: { name: branchName },
  products: product,
});

describe("fetchLocalProductsCatalog", () => {
  let fake;

  beforeEach(() => {
    const products = [0, 1, 2, 3].map((index) => buildProduct(index));

    fake = createFakePostgrest({
      branch_inventory: [
        buildRow(0, products[0], "Centro"),
        buildRow(1, products[0], "Norte"),
        buildRow(2, products[1], "Centro"),
        buildRow(3, products[2], "Sur"),
        buildRow(4, products[3], "Norte"),
        buildRow(5, buildProduct(5, { is_global: true }), "Centro"),
        buildRow(6, buildProduct(6, { status: false }), "Centro"),
      ],
    });
    supabase.from.mockImplementation(fake.from);
  });

  it("lee todos los productos locales activos aunque superen una pagina", async () => {
    const result = await fetchLocalProductsCatalog();

    expect(result.map((product) => product.id)).toEqual([
      buildId("p", 0),
      buildId("p", 1),
      buildId("p", 2),
      buildId("p", 3),
    ]);
    expect(result[0].localBranchNames).toEqual(["Centro", "Norte"]);
    expect(fake.calls.length).toBeGreaterThan(1);
  });

  it("filtra productos locales activos en el servidor", async () => {
    await fetchLocalProductsCatalog();

    expect(
      fake.calls[0].filters.map(({ column, value }) => [column, value])
    ).toEqual([
      ["products.is_global", false],
      ["products.status", true],
    ]);
  });

  it("propaga el error de una pagina", async () => {
    const failure = new Error("fallo");
    supabase.from.mockImplementation(() => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => Promise.resolve({ data: null, error: failure }),
      };
      return query;
    });

    await expect(fetchLocalProductsCatalog()).rejects.toBe(failure);
  });
});
