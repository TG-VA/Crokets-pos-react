import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";

import useInventoryReportFilters from "./useInventoryReportFilters";
import {
  INITIAL_FACET_FILTERS,
  QUANTITY_FILTER_PREFIX,
} from "../utils/inventoryReportUtils";

describe("useInventoryReportFilters", () => {
  it("inicializa filtros vacios", () => {
    const { result } = renderHook(() => useInventoryReportFilters());
    expect(result.current.facetFilters).toEqual(INITIAL_FACET_FILTERS);
    expect(result.current.openFacet).toBeNull();
    expect(result.current.facetSearch).toEqual({});
    expect(result.current.existenceQuantity).toBe("");
  });

  it("toggleFacet: abre y cierra el mismo facet", () => {
    const { result } = renderHook(() => useInventoryReportFilters());
    act(() => result.current.toggleFacet("depto"));
    expect(result.current.openFacet).toBe("depto");
    expect(result.current.facetSearch).toEqual({ depto: "" });
    act(() => result.current.toggleFacet("depto"));
    expect(result.current.openFacet).toBeNull();
  });

  it("toggleFacetValue: agrega y quita un valor y cierra el facet", () => {
    const { result } = renderHook(() => useInventoryReportFilters());
    act(() => result.current.toggleFacet("depto"));
    act(() => result.current.toggleFacetValue("depto", "Perros"));
    expect(result.current.facetFilters.depto).toEqual(["Perros"]);
    expect(result.current.openFacet).toBeNull();
    act(() => result.current.toggleFacetValue("depto", "Perros"));
    expect(result.current.facetFilters.depto).toEqual([]);
  });

  it("handleSelectAllFacet: reemplaza los valores y cierra el facet", () => {
    const { result } = renderHook(() => useInventoryReportFilters());
    act(() => result.current.toggleFacet("nombre"));
    act(() => result.current.handleSelectAllFacet("nombre", ["A", "B"]));
    expect(result.current.facetFilters.nombre).toEqual(["A", "B"]);
    expect(result.current.openFacet).toBeNull();
  });

  it("handleExistenceQuantityChange: conserva solo digitos", () => {
    const { result } = renderHook(() => useInventoryReportFilters());
    act(() =>
      result.current.handleExistenceQuantityChange({
        target: { value: "1a2-3" },
      })
    );
    expect(result.current.existenceQuantity).toBe("123");
  });

  it("applyExistenceQuantityFilter: normaliza y reemplaza la cantidad previa", () => {
    const { result } = renderHook(() => useInventoryReportFilters());
    act(() =>
      result.current.handleExistenceQuantityChange({ target: { value: "007" } })
    );
    act(() => result.current.applyExistenceQuantityFilter());
    expect(result.current.facetFilters.existencia).toEqual([
      `${QUANTITY_FILTER_PREFIX}7`,
    ]);
    expect(result.current.existenceQuantity).toBe("7");

    act(() =>
      result.current.handleExistenceQuantityChange({ target: { value: "3" } })
    );
    act(() => result.current.applyExistenceQuantityFilter());
    expect(result.current.facetFilters.existencia).toEqual([
      `${QUANTITY_FILTER_PREFIX}3`,
    ]);
  });

  it("applyExistenceQuantityFilter: no hace nada sin cantidad", () => {
    const { result } = renderHook(() => useInventoryReportFilters());
    act(() => result.current.applyExistenceQuantityFilter());
    expect(result.current.facetFilters.existencia).toEqual([]);
  });

  it("removeExistenceQuantityFilter: quita solo la cantidad", () => {
    const { result } = renderHook(() => useInventoryReportFilters());
    act(() => result.current.toggleFacetValue("existencia", "agotado"));
    act(() =>
      result.current.handleExistenceQuantityChange({ target: { value: "5" } })
    );
    act(() => result.current.applyExistenceQuantityFilter());
    act(() => result.current.removeExistenceQuantityFilter());
    expect(result.current.facetFilters.existencia).toEqual(["agotado"]);
    expect(result.current.existenceQuantity).toBe("");
  });

  it("clearFacet: limpia existencia y su cantidad", () => {
    const { result } = renderHook(() => useInventoryReportFilters());
    act(() =>
      result.current.handleExistenceQuantityChange({ target: { value: "5" } })
    );
    act(() => result.current.applyExistenceQuantityFilter());
    act(() => result.current.clearFacet("existencia"));
    expect(result.current.facetFilters.existencia).toEqual([]);
    expect(result.current.existenceQuantity).toBe("");
  });

  it("clearAllFilters: reinicia todo el estado", () => {
    const { result } = renderHook(() => useInventoryReportFilters());
    act(() => result.current.toggleFacetValue("depto", "Perros"));
    act(() => result.current.handleSearchFacet("depto", "pe"));
    act(() => result.current.toggleFacet("nombre"));
    act(() => result.current.clearAllFilters());
    expect(result.current.facetFilters).toEqual({
      nombre: [],
      depto: [],
      existencia: [],
    });
    expect(result.current.facetSearch).toEqual({});
    expect(result.current.openFacet).toBeNull();
  });

  it("cierra el facet abierto con Escape", () => {
    const { result } = renderHook(() => useInventoryReportFilters());
    act(() => result.current.toggleFacet("depto"));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(result.current.openFacet).toBeNull();
  });

  it("cierra el facet abierto con clic fuera del popover", () => {
    const { result } = renderHook(() => useInventoryReportFilters());
    act(() => result.current.toggleFacet("depto"));
    act(() => {
      document.body.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true })
      );
    });
    expect(result.current.openFacet).toBeNull();
  });
});
