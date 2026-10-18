import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

/*
  Contrato de paginacion server-side de useProductsList: la pagina elegida se
  conserva (no se revierte a 1 por un efecto residual), el cambio de tamano
  reinicia a la pagina 1 y los filtros (busqueda y departamento) resetean la
  paginacion. La seleccion de fila se indexa localmente a la pagina.
*/

const { useBranch } = vi.hoisted(() => ({
  useBranch: vi.fn(() => ({ branch: { id: "b1", name: "Merida" } })),
}));

vi.mock("../../../../../contexts/BranchContext", () => ({ useBranch }));

const { fetchDepartments, fetchPaginatedBranchProducts } = vi.hoisted(() => ({
  fetchDepartments: vi.fn(),
  fetchPaginatedBranchProducts: vi.fn(),
}));

vi.mock("../../../../../services/products/productCatalogService", () => ({
  fetchDepartments,
  fetchPaginatedBranchProducts,
}));

vi.mock("../../../../../hooks/useProductsRealtime", () => ({
  useProductsRealtime: vi.fn(() => ({ markLocalMutation: vi.fn() })),
}));

import { useProductsList } from "./useProductsList";

const makeProducts = (count, page, pageSize) =>
  Array.from({ length: count }, (_, i) => ({
    product_id: `p-${page}-${i}`,
    codigo: `C${(page - 1) * pageSize + i}`,
    descripcion: `Producto ${(page - 1) * pageSize + i}`,
    departamento: "Alimentos",
    costo: 10,
    precio: 20,
  }));

const mockServicePage = ({ totalCount = 25 } = {}) => {
  fetchPaginatedBranchProducts.mockImplementation(
    async ({ page, pageSize }) => ({
      success: true,
      data: {
        products: makeProducts(
          Math.min(pageSize, Math.max(0, totalCount - (page - 1) * pageSize)),
          page,
          pageSize
        ),
        totalCount,
      },
    })
  );
};

describe("useProductsList paginacion server-side", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useBranch.mockReturnValue({ branch: { id: "b1", name: "Merida" } });
    fetchDepartments.mockResolvedValue({ success: true, data: [] });
    mockServicePage({ totalCount: 25, pageSize: 10 });
  });

  it("inicializa en la pagina 1 con el pageSize configurado", async () => {
    const { result } = renderHook(() => useProductsList());

    await waitFor(() => expect(result.current.loadingProducts).toBe(false));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.paginatedProducts).toHaveLength(10);
  });

  it("conserva la pagina 2 tras invocar handlePageChange (no la revierte a 1)", async () => {
    const { result } = renderHook(() => useProductsList());

    await waitFor(() => expect(result.current.loadingProducts).toBe(false));

    act(() => result.current.handlePageChange(2));

    await waitFor(() => expect(result.current.currentPage).toBe(2));
    expect(result.current.selectedRowIndex).toBe(0);

    await waitFor(() =>
      expect(fetchPaginatedBranchProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 })
      )
    );

    await waitFor(() => expect(result.current.loadingProducts).toBe(false));
    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedProducts).toHaveLength(10);
    expect(result.current.paginatedProducts[0].codigo).toBe("C10");
  });

  it("actualiza el tamano de pagina y resetea a la pagina 1", async () => {
    const { result } = renderHook(() => useProductsList());

    await waitFor(() => expect(result.current.loadingProducts).toBe(false));

    act(() => result.current.handlePageChange(3));
    await waitFor(() => expect(result.current.currentPage).toBe(3));

    act(() => result.current.handlePageSizeChange(25));

    expect(result.current.pageSize).toBe(25);
    expect(result.current.currentPage).toBe(1);
    await waitFor(() =>
      expect(fetchPaginatedBranchProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, pageSize: 25 })
      )
    );
  });

  it("resetea la paginacion a la pagina 1 al cambiar el termino de busqueda", async () => {
    const { result } = renderHook(() => useProductsList());

    await waitFor(() => expect(result.current.loadingProducts).toBe(false));

    act(() => result.current.handlePageChange(2));
    await waitFor(() => expect(result.current.currentPage).toBe(2));

    act(() => result.current.setSearchTerm("collar"));

    await waitFor(() => expect(result.current.currentPage).toBe(1), {
      timeout: 2000,
    });
    await waitFor(
      () =>
        expect(fetchPaginatedBranchProducts).toHaveBeenLastCalledWith(
          expect.objectContaining({ searchTerm: "collar", page: 1 })
        ),
      { timeout: 2000 }
    );
  });

  it("resetea la paginacion a la pagina 1 al seleccionar un departamento", async () => {
    fetchDepartments.mockResolvedValue({
      success: true,
      data: [{ id: "d1", name: "Alimentos" }],
    });

    const { result } = renderHook(() => useProductsList());

    await waitFor(() => expect(result.current.departments).toHaveLength(1));

    act(() => result.current.handlePageChange(2));
    await waitFor(() => expect(result.current.currentPage).toBe(2));

    act(() => result.current.handleDepartmentSelect("Alimentos"));

    expect(result.current.currentPage).toBe(1);
    await waitFor(() =>
      expect(fetchPaginatedBranchProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ departmentId: "d1", page: 1 })
      )
    );
  });

  it("indexa la seleccion de fila localmente a la pagina vigente", async () => {
    const { result } = renderHook(() => useProductsList());

    await waitFor(() => expect(result.current.loadingProducts).toBe(false));

    act(() => result.current.handlePageChange(2));
    await waitFor(() => expect(result.current.currentPage).toBe(2));

    act(() => result.current.handleRowClick(3));
    expect(result.current.selectedRowIndex).toBe(3);

    act(() => result.current.handleRowClick(9));
    expect(result.current.selectedRowIndex).toBe(9);
    expect(result.current.selectedRowIndex).toBeLessThan(
      result.current.paginatedProducts.length
    );
  });
});
