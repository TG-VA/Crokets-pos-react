import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKitsList } from "./useKitsList";

const makeKits = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    is_active: i % 2 === 0,
    products: { name: `KIT ${i + 1}`, barcode: `B${i + 1}` },
  }));

describe("useKitsList", () => {
  it("pagina de 4 en 4", () => {
    const { result } = renderHook(() => useKitsList(makeKits(9)));
    expect(result.current.visibleKits).toHaveLength(4);
    expect(result.current.pagination.totalPages).toBe(3);
  });

  it("regresa a la primera pagina al cambiar el filtro", () => {
    const { result } = renderHook(() => useKitsList(makeKits(9)));
    act(() => result.current.pagination.handlePageChange(3));
    expect(result.current.pagination.currentPage).toBe(3);
    act(() => result.current.setStatus("all"));
    expect(result.current.pagination.currentPage).toBe(1);
    act(() => result.current.pagination.handlePageChange(3));
    act(() => result.current.setStatus("inactive"));
    expect(result.current.pagination.currentPage).toBe(1);
    expect(result.current.filteredKits.every((k) => !k.is_active)).toBe(true);
  });

  it("regresa a la primera pagina al cambiar el texto de busqueda", () => {
    const { result } = renderHook(() => useKitsList(makeKits(9)));
    act(() => result.current.pagination.handlePageChange(3));
    expect(result.current.pagination.currentPage).toBe(3);
    act(() => result.current.setSearchTerm("kit"));
    expect(result.current.filteredKits).toHaveLength(9);
    expect(result.current.pagination.currentPage).toBe(1);
  });

  it("filtra por texto", () => {
    const { result } = renderHook(() => useKitsList(makeKits(9)));
    act(() => result.current.setSearchTerm("kit 7"));
    expect(result.current.filteredKits.map((k) => k.id)).toEqual([7]);
  });
});
