import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("../supabase/paginatedQuery", async (importOriginal) => {
  const { withSmallPages } =
    await import("../supabase/fakePostgrest.testUtils");
  return withSmallPages(await importOriginal());
});

import { supabase } from "../../lib/supabaseClient";
import {
  buildId,
  createFakePostgrest,
} from "../supabase/fakePostgrest.testUtils";
import { fetchBranchCatalog } from "./productCatalogService";

/*
  El doble corta cada respuesta en 2 filas, como PostgREST con max-rows: sin
  paginar, el catalogo de 5 productos de sucursal llegaria con solo 2.
*/

const buildProduct = (index, overrides = {}) => ({
  id: buildId("p", index),
  barcode: `BC${index}`,
  name: `Producto ${index}`,
  department_id: "d-1",
  status: true,
  is_global: false,
  // Alta en orden inverso al id para comprobar el orden en memoria.
  created_at: `2026-01-${String(20 - index).padStart(2, "0")}T00:00:00Z`,
  ...overrides,
});

const buildInventoryRow = (product, index) => ({
  id: buildId("bi", index),
  branch_id: "b-1",
  product_id: product.id,
  stock: index,
  is_active: true,
  created_at: product.created_at,
  products: product,
});

describe("productCatalogService", () => {
  let fake;

  beforeEach(() => {
    const branchProducts = [0, 1, 2, 3, 4].map((index) => buildProduct(index));
    const globalProducts = [5, 6, 7].map((index) =>
      buildProduct(index, { is_global: true })
    );

    fake = createFakePostgrest({
      departments: [
        { id: "d-1", name: "Alimento" },
        { id: "d-2", name: "Juguetes" },
        { id: "d-3", name: "Higiene" },
      ],
      branch_inventory: [
        ...branchProducts.map(buildInventoryRow),
        buildInventoryRow(buildProduct(8), 8),
      ].map((row) =>
        row.id === buildId("bi", 8) ? { ...row, branch_id: "b-2" } : row
      ),
      products: [
        ...globalProducts,
        buildProduct(9, { is_global: true, status: false }),
      ],
    });
    supabase.from.mockImplementation(fake.from);
  });

  it("lee el catalogo completo aunque supere una pagina", async () => {
    const result = await fetchBranchCatalog("b-1");

    expect(result.success).toBe(true);
    expect(result.data.kardexProducts).toHaveLength(5);
    expect(result.data.products).toHaveLength(8);
    expect(
      fake.calls.filter((call) => call.table === "branch_inventory")
    ).toHaveLength(3);
  });

  it("conserva el orden de alta ascendente", async () => {
    const result = await fetchBranchCatalog("b-1");

    expect(result.data.products.map((product) => product.codigo)).toEqual([
      "BC4",
      "BC3",
      "BC2",
      "BC1",
      "BC0",
      "BC7",
      "BC6",
      "BC5",
    ]);
  });

  it("resuelve departamentos de mas de una pagina", async () => {
    const result = await fetchBranchCatalog("b-1");

    expect(result.data.products[0].departamento).toBe("Alimento");
    expect(
      fake.calls.filter((call) => call.table === "departments")
    ).toHaveLength(2);
  });

  it("devuelve el contrato de error si una pagina falla", async () => {
    supabase.from.mockImplementation(() => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () =>
          Promise.resolve({ data: null, error: { message: "boom" } }),
      };
      return query;
    });

    const result = await fetchBranchCatalog("b-1");

    expect(result).toEqual({
      success: false,
      data: { kardexProducts: [], products: [] },
      error: "boom",
      partial: false,
    });
  });
});
