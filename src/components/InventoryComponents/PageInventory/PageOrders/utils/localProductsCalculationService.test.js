import { describe, expect, it } from "vitest";

import { groupLocalProductsByBranch } from "./localProductsCalculationService";

const buildRow = (productId, branchName, overrides = {}) => ({
  products: {
    id: productId,
    barcode: `COD-${productId}`,
    name: `producto ${productId}`,
    is_global: false,
    department: { name: "Accesorios" },
    ...overrides,
  },
  branches: { name: branchName },
});

describe("groupLocalProductsByBranch", () => {
  it("agrupa un producto local con todas sus sucursales, ordenadas", () => {
    const [product] = groupLocalProductsByBranch([
      buildRow("p1", "Norte"),
      buildRow("p1", "Centro"),
      buildRow("p1", "Centro"),
    ]);

    expect(product).toEqual({
      id: "p1",
      product_id: "p1",
      codigo: "COD-p1",
      descripcion: "PRODUCTO P1",
      departamento: "Accesorios",
      is_global: false,
      localBranchNames: ["Centro", "Norte"],
    });
  });

  it("separa productos distintos y descarta los globales", () => {
    const result = groupLocalProductsByBranch([
      buildRow("p1", "Centro"),
      buildRow("p2", "Sur"),
      buildRow("g1", "Centro", { is_global: true }),
    ]);

    expect(result.map((product) => product.id)).toEqual(["p1", "p2"]);
  });

  it("usa Sin departamento y tolera entradas invalidas", () => {
    const [product] = groupLocalProductsByBranch([
      buildRow("p1", "Centro", { department: null }),
      { products: null, branches: null },
    ]);

    expect(product.departamento).toBe("Sin departamento");
    expect(groupLocalProductsByBranch(null)).toEqual([]);
  });
});
