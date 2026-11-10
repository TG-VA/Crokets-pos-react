import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKitsList } from "./useKitsList";

const makeKits = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    is_active: i % 2 === 0,
    products: { name: `KIT ${i + 1}`, barcode: `B${i + 1}` },
  }));

describe("useKitsList", () => {
  it("pagina de 10 en 10 y expone las opciones de tamano", () => {
    const { result } = renderHook(() => useKitsList(makeKits(25)));
    expect(result.current.visibleKits).toHaveLength(10);
    expect(result.current.pagination.totalPages).toBe(3);
    expect(result.current.pageSizeOptions).toEqual([5, 10, 20]);
  });

  it("regresa a la primera pagina al cambiar el filtro", () => {
    const { result } = renderHook(() => useKitsList(makeKits(25)));
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
    const { result } = renderHook(() => useKitsList(makeKits(25)));
    act(() => result.current.pagination.handlePageChange(3));
    expect(result.current.pagination.currentPage).toBe(3);
    act(() => result.current.setSearchTerm("kit"));
    expect(result.current.filteredKits).toHaveLength(25);
    expect(result.current.pagination.currentPage).toBe(1);
  });

  it("filtra por texto", () => {
    const { result } = renderHook(() => useKitsList(makeKits(25)));
    act(() => result.current.setSearchTerm("kit 7"));
    expect(result.current.filteredKits.map((k) => k.id)).toEqual([7]);
  });

  it("ordena antes de paginar y regresa a la primera pagina al cambiar el orden", () => {
    const kits = makeKits(25).map((k) => ({
      ...k,
      products: { ...k.products, sale_price: 100 - k.id },
    }));
    const { result } = renderHook(() => useKitsList(kits));
    act(() => result.current.pagination.handlePageChange(3));
    act(() => result.current.setSortCriterion("price"));
    expect(result.current.sortCriterion).toBe("price");
    expect(result.current.pagination.currentPage).toBe(1);
    expect(result.current.visibleKits[0].id).toBe(25);
  });
  describe("por vencer", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-10T18:00:00Z"));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    const makeExpiringKits = () => [
      {
        id: 1,
        is_active: true,
        ends_on: "2026-11-12",
        products: { name: "A" },
      },
      {
        id: 2,
        is_active: true,
        ends_on: "2026-12-30",
        products: { name: "B" },
      },
      { id: 3, is_active: true, ends_on: null, products: { name: "C" } },
      {
        id: 4,
        is_active: false,
        ends_on: "2026-11-11",
        products: { name: "D" },
      },
      {
        id: 5,
        is_active: true,
        ends_on: "2026-11-10",
        products: { name: "E" },
      },
    ];

    it("cuenta los kits por vencer en los proximos 3 dias", () => {
      const { result } = renderHook(() => useKitsList(makeExpiringKits()));
      expect(result.current.expiringCount).toBe(2);
    });

    it("el filtro por vencer deja solo esos kits y se alterna", () => {
      const { result } = renderHook(() => useKitsList(makeExpiringKits()));
      expect(result.current.expiringOnly).toBe(false);
      act(() => result.current.toggleExpiringOnly());
      expect(result.current.expiringOnly).toBe(true);
      expect(result.current.filteredKits.map((k) => k.id).sort()).toEqual([
        1, 5,
      ]);
      act(() => result.current.toggleExpiringOnly());
      expect(result.current.filteredKits).toHaveLength(5);
    });

    it("regresa a la primera pagina al alternar el filtro por vencer", () => {
      const kits = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        is_active: true,
        ends_on: "2026-11-11",
        products: { name: `KIT ${i + 1}` },
      }));
      const { result } = renderHook(() => useKitsList(kits));
      act(() => result.current.pagination.handlePageChange(3));
      act(() => result.current.toggleExpiringOnly());
      expect(result.current.pagination.currentPage).toBe(1);
    });
  });
});
