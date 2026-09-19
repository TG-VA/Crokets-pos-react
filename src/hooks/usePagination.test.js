import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePagination } from "./usePagination";

describe("usePagination", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("inicializa la paginación con los valores por defecto", () => {
    const { result } = renderHook(() => usePagination({ totalItems: 100 }));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(10);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(10);
  });

  it("calcula el total de páginas con una última página parcial", () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 25, defaultPageSize: 10 })
    );

    expect(result.current.totalPages).toBe(3);
    expect(result.current.endIndex).toBe(10);
  });

  it("pageItems devuelve el slice correspondiente a la página actual", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const { result } = renderHook(() => usePagination({ totalItems: items.length }));

    expect(result.current.pageItems(items)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("handlePageChange navega dentro del rango y actualiza los índices", () => {
    const { result } = renderHook(() => usePagination({ totalItems: 100 }));

    act(() => result.current.handlePageChange(3));

    expect(result.current.currentPage).toBe(3);
    expect(result.current.startIndex).toBe(20);
    expect(result.current.endIndex).toBe(30);
  });

  it("handlePageChange limita la página solicitada al total de páginas", () => {
    const { result } = renderHook(() => usePagination({ totalItems: 100 }));

    act(() => result.current.handlePageChange(999));

    expect(result.current.currentPage).toBe(10);
  });

  it("handlePageSizeChange cambia el tamaño y resetea a la página 1", () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, pageSizeOptions: [10, 25, 50] })
    );

    act(() => result.current.handlePageChange(5));
    act(() => result.current.handlePageSizeChange(25));

    expect(result.current.pageSize).toBe(25);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(4);
  });

  it("ajusta la página actual cuando el total de ítems disminuye", async () => {
    const { result, rerender } = renderHook(
      ({ total }) => usePagination({ totalItems: total }),
      { initialProps: { total: 100 } }
    );

    act(() => result.current.handlePageChange(10));
    rerender({ total: 50 });

    await waitFor(() => expect(result.current.currentPage).toBe(5));
    expect(result.current.totalPages).toBe(5);
  });

  it("lee el tamaño de página guardado en localStorage", () => {
    localStorage.setItem("crokets.test.pageSize", "25");

    const { result } = renderHook(() =>
      usePagination({
        totalItems: 100,
        storageKey: "crokets.test.pageSize",
        pageSizeOptions: [10, 25, 50],
      })
    );

    expect(result.current.pageSize).toBe(25);
  });

  it("ignora un valor guardado inválido y usa el default", () => {
    localStorage.setItem("crokets.test.pageSize", "999");

    const { result } = renderHook(() =>
      usePagination({
        totalItems: 100,
        storageKey: "crokets.test.pageSize",
        pageSizeOptions: [10, 25, 50],
      })
    );

    expect(result.current.pageSize).toBe(10);
  });

  it("persiste el tamaño elegido en localStorage", () => {
    const { result } = renderHook(() =>
      usePagination({
        totalItems: 100,
        storageKey: "crokets.test.pageSize",
        pageSizeOptions: [10, 25, 50],
      })
    );

    act(() => result.current.handlePageSizeChange(50));

    expect(localStorage.getItem("crokets.test.pageSize")).toBe("50");
  });
});
