import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const productsState = {
  products: [],
  loadingProducts: true,
  productsError: "Error al cargar",
  getProductByCodigo: vi.fn(),
  refreshProducts: vi.fn(),
};

vi.mock("../../../../../contexts/ProductsContext", () => ({
  useProducts: () => productsState,
}));

vi.mock("../../../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "branch-1" } }),
}));

vi.mock("../../../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("../services/inventoryAdjustmentService", () => ({
  applyInventoryAdjustment: vi.fn(),
}));

import useInventoryAdjustment from "./useInventoryAdjustment";

describe("useInventoryAdjustment", () => {
  it("expone el estado de carga y error de productos para el buscador", () => {
    const { result } = renderHook(() => useInventoryAdjustment());

    expect(result.current.loadingProducts).toBe(true);
    expect(result.current.productsError).toBe("Error al cargar");
  });
});
