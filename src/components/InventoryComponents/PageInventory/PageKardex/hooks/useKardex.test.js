import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("../../../../../contexts/ProductsContext", () => ({
  useProducts: () => ({
    kardexProducts: [],
    loadingProducts: true,
    productsError: "Error al cargar",
  }),
}));

vi.mock("../../../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "branch-1" } }),
}));

vi.mock("./useKardexProducts", () => ({
  default: () => ({
    products: [],
    selectedProducts: [null, null],
    selectedProductIds: [],
  }),
}));

vi.mock("./useKardexDateRange", () => ({
  default: () => ({ appliedDateFrom: "", appliedDateTo: "", filterVersion: 0 }),
}));

vi.mock("./useKardexMovements", () => ({ default: () => ({}) }));

import useKardex from "./useKardex";

describe("useKardex", () => {
  it("expone el estado de carga y error de productos para el buscador", () => {
    const { result } = renderHook(() => useKardex());

    expect(result.current.loadingProducts).toBe(true);
    expect(result.current.productsError).toBe("Error al cargar");
  });
});
