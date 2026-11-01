import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDepartmentsFilters } from "./useDepartmentsFilters";

const buildDepartments = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: index < 12 ? `ALIMENTO ${index}` : `JUGUETE ${index}`,
    status: true,
    commission_enabled: false,
  }));

describe("useDepartmentsFilters", () => {
  it("pagina de 8 en 8", () => {
    const { result } = renderHook(() =>
      useDepartmentsFilters(buildDepartments(20))
    );
    expect(result.current.visibleDepartments).toHaveLength(8);
    expect(result.current.totalFiltered).toBe(20);
  });

  it("reinicia la pagina al cambiar un filtro", () => {
    const departments = buildDepartments(20);
    const { result } = renderHook(() => useDepartmentsFilters(departments));

    act(() => result.current.pagination.handlePageChange(3));
    expect(result.current.pagination.currentPage).toBe(3);

    act(() => result.current.setFilter("search", "alimento"));
    expect(result.current.totalFiltered).toBe(12);
    expect(result.current.pagination.currentPage).toBe(1);
    expect(result.current.visibleDepartments).toHaveLength(8);
  });
});
