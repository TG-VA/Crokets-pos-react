import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import useMovementsFilters from "./useMovementsFilters";

const ROWS = [
  {
    id: "a",
    movement_type: "adjustment",
    created_at: "2026-02-10T12:00:00",
    display_product_name: "Croquetas",
    users: { username: "ana" },
  },
  {
    id: "b",
    movement_type: "entry",
    created_at: "2026-02-11T12:00:00",
    display_product_name: "Arena",
    users: { username: "luis" },
  },
  {
    id: "c",
    movement_type: "entry",
    created_at: "2026-02-20T12:00:00",
    display_product_name: "Fuera",
    users: { username: "ana" },
  },
];

const render = (props = {}) =>
  renderHook(() =>
    useMovementsFilters({
      rows: ROWS,
      startDateKey: "2026-02-10",
      endDateKey: "2026-02-11",
      ...props,
    })
  );

const ids = (rows) => rows.map((row) => row.id);

describe("useMovementsFilters", () => {
  it("recorta las filas al rango por dia local", () => {
    const { result } = render();

    expect(result.current.periodRowsCount).toBe(2);
    expect(ids(result.current.filteredRows)).toEqual(["a", "b"]);
  });

  it("arma las opciones de faceta solo con filas del periodo", () => {
    const { result } = render();

    expect(result.current.facetOptions.product.map((o) => o.value)).toEqual([
      "ARENA",
      "CROQUETAS",
    ]);
    expect(result.current.facetOptions.type.map((o) => o.label)).toEqual([
      "Ajuste",
      "Entrada",
    ]);
  });

  it("filtra por faceta y restablece con resetAllFilters", () => {
    const { result } = render();

    act(() => result.current.setFacetValues("type", ["entry"]));
    expect(ids(result.current.filteredRows)).toEqual(["b"]);
    expect(result.current.isFacetActive("type")).toBe(true);

    act(() => result.current.showNoFacetValues("user"));
    expect(result.current.filteredRows).toEqual([]);

    act(() => result.current.resetAllFilters());
    expect(ids(result.current.filteredRows)).toEqual(["a", "b"]);
  });

  it("toggleFacetValue vuelve a null al marcar todas las opciones", () => {
    const { result } = render();

    act(() => result.current.toggleFacetValue("user", "ANA"));
    expect(result.current.facetFilters.user).toEqual(["LUIS"]);

    act(() => result.current.toggleFacetValue("user", "ANA"));
    expect(result.current.facetFilters.user).toBeNull();
  });

  it("busca dentro de las opciones de una faceta", () => {
    const { result } = render();

    act(() => result.current.setFacetSearchValue("product", "aren"));

    expect(
      result.current.getVisibleFacetOptions("product").map((o) => o.value)
    ).toEqual(["ARENA"]);
  });
});
