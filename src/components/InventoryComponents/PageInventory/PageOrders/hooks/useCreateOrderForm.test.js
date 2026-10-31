import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

vi.mock("../../../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));
vi.mock("../services/ordersService", () => ({ createStoreOrder: vi.fn() }));

import { useCreateOrderForm } from "./useCreateOrderForm";

const buildProduct = (overrides = {}) => ({
  id: "p1",
  codigo: "COD-1",
  descripcion: "CROQUETA",
  departamento: "Alimento",
  costo: 10,
  is_global: true,
  ...overrides,
});

const renderForm = (products) =>
  renderHook(() =>
    useCreateOrderForm({
      currentBranch: { id: "b1" },
      branches: [],
      products,
    })
  );

describe("useCreateOrderForm productos permitidos", () => {
  it("agrega un producto global", () => {
    const { result } = renderForm([]);

    let added;
    act(() => {
      added = result.current.addProduct(buildProduct());
    });

    expect(added).toBe(true);
    expect(result.current.items).toHaveLength(1);
  });

  it("rechaza un kit aunque sea global", () => {
    const kit = buildProduct({ id: "k1", is_kit: true });
    const { result } = renderForm([kit]);

    let added;
    act(() => {
      added = result.current.addProduct(kit);
    });

    expect(added).toBe(false);
    expect(result.current.items).toHaveLength(0);
    expect(result.current.error).toContain("kits");
  });

  it("rechaza un kit capturado por codigo de barras", () => {
    const kit = buildProduct({ id: "k1", codigo: "KIT-1", is_kit: true });
    const { result } = renderForm([kit]);

    let added;
    act(() => {
      added = result.current.handleCodeSubmit("kit-1");
    });

    expect(added).toBe(false);
    expect(result.current.items).toHaveLength(0);
  });
});
