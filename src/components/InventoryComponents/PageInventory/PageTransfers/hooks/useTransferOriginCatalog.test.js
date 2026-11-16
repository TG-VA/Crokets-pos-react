import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

vi.mock("../../../../../services/products/productCatalogService", () => ({
  fetchBranchCatalog: vi.fn(),
}));

import { fetchBranchCatalog } from "../../../../../services/products/productCatalogService";
import useTransferOriginCatalog from "./useTransferOriginCatalog";

const contextCatalog = {
  products: [{ id: "ctx", codigo: "1" }],
  getProductByCodigo: vi.fn(),
  refreshProducts: vi.fn(),
  loadingProducts: false,
  productsError: null,
};

const adminBranch = { id: "adm", branch_type: "admin" };

const catalogFor = (branchId) => ({
  success: true,
  data: { products: [{ id: `p-${branchId}`, codigo: branchId }] },
});

const renderCatalog = (initialProps) =>
  renderHook((props) => useTransferOriginCatalog(props), { initialProps });

describe("useTransferOriginCatalog", () => {
  beforeEach(() => {
    fetchBranchCatalog.mockReset();
    fetchBranchCatalog.mockImplementation((id) =>
      Promise.resolve(catalogFor(id))
    );
  });

  it("una terminal operativa usa el catalogo del contexto sin consultar", () => {
    const { result } = renderCatalog({
      branch: { id: "b1" },
      originBranchId: "b1",
      contextCatalog,
    });

    expect(result.current).toBe(contextCatalog);
    expect(fetchBranchCatalog).not.toHaveBeenCalled();
  });

  it("una terminal admin sin origen no carga productos", () => {
    const { result } = renderCatalog({
      branch: adminBranch,
      originBranchId: "",
      contextCatalog,
    });

    expect(result.current.products).toEqual([]);
    expect(result.current.loadingProducts).toBe(false);
    expect(fetchBranchCatalog).not.toHaveBeenCalled();
  });

  it("una terminal admin carga el stock de la sucursal origen", async () => {
    const { result } = renderCatalog({
      branch: adminBranch,
      originBranchId: "b2",
      contextCatalog,
    });

    expect(result.current.loadingProducts).toBe(true);
    await waitFor(() =>
      expect(result.current.products).toEqual([{ id: "p-b2", codigo: "b2" }])
    );
    expect(fetchBranchCatalog).toHaveBeenCalledWith("b2");
    expect(result.current.getProductByCodigo("b2")?.id).toBe("p-b2");
  });

  it("no muestra el catalogo anterior al cambiar de origen", async () => {
    const { result, rerender } = renderCatalog({
      branch: adminBranch,
      originBranchId: "b2",
      contextCatalog,
    });
    await waitFor(() => expect(result.current.products).toHaveLength(1));

    fetchBranchCatalog.mockImplementation(() => new Promise(() => {}));
    rerender({ branch: adminBranch, originBranchId: "b3", contextCatalog });

    expect(result.current.products).toEqual([]);
    expect(result.current.loadingProducts).toBe(true);
  });

  it("refreshProducts vuelve a consultar el origen", async () => {
    const { result } = renderCatalog({
      branch: adminBranch,
      originBranchId: "b2",
      contextCatalog,
    });
    await waitFor(() => expect(result.current.products).toHaveLength(1));

    await act(() => result.current.refreshProducts());

    expect(fetchBranchCatalog).toHaveBeenCalledTimes(2);
  });

  it("expone el error y registra console.error si la carga falla", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchBranchCatalog.mockResolvedValue({ success: false, error: "RLS" });

    const { result } = renderCatalog({
      branch: adminBranch,
      originBranchId: "b2",
      contextCatalog,
    });

    await waitFor(() =>
      expect(result.current.productsError).toBe(
        "Error al cargar productos de la sucursal origen"
      )
    );
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
