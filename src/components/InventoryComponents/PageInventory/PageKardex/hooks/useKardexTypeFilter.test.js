import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import useKardexTypeFilter from "./useKardexTypeFilter";

const rowsBySlot = [
  [
    { id: 1, movement_type: "sale" },
    { id: 2, movement_type: "adjustment" },
  ],
  [],
];

describe("useKardexTypeFilter", () => {
  it("arranca sin filtrar y filtra cada slot al cambiar el tipo", () => {
    const { result } = renderHook(() => useKardexTypeFilter(rowsBySlot));

    expect(result.current.filteredRowsBySlot[0]).toHaveLength(2);

    act(() => result.current.setTypeFilter("sale"));

    expect(result.current.typeFilter).toBe("sale");
    expect(result.current.filteredRowsBySlot[0]).toEqual([rowsBySlot[0][0]]);
    expect(result.current.filteredRowsBySlot[1]).toEqual([]);
  });
});
