import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";

import useTransferHistoryFilters from "./useTransferHistoryFilters";

const buildOrder = (id, folio, createdAt) => ({ id, folio, createdAt });

const history = [
  buildOrder("1", "TR-001", new Date(2026, 9, 20, 9, 0, 0).toISOString()),
  buildOrder("2", "TR-002", new Date(2026, 9, 21, 9, 0, 0).toISOString()),
  buildOrder("3", "OTRO-003", new Date(2026, 9, 21, 18, 0, 0).toISOString()),
];

describe("useTransferHistoryFilters", () => {
  it("filtra por folio y fechas", () => {
    const { result } = renderHook(() =>
      useTransferHistoryFilters({ transferHistory: history })
    );

    act(() => result.current.handleFolioSearchChange("TR-00"));

    expect(result.current.filteredHistory.map((order) => order.id)).toEqual([
      "1",
      "2",
    ]);
    expect(result.current.hasActiveFilters).toBe(true);

    act(() =>
      result.current.handleDateChange("dateFrom", new Date(2026, 9, 21))
    );

    expect(result.current.filteredHistory.map((order) => order.id)).toEqual([
      "2",
    ]);
    expect(result.current.rangePreset).toBe("custom");
  });

  it("limpia folio, fechas y preset", () => {
    const { result } = renderHook(() =>
      useTransferHistoryFilters({ transferHistory: history })
    );

    act(() => result.current.handleFolioSearchChange("TR-002"));
    act(() => result.current.handleRangePreset("today"));
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.handleClearFilters());

    expect(result.current.folioSearch).toBe("");
    expect(result.current.dateRange).toEqual({ dateFrom: null, dateTo: null });
    expect(result.current.rangePreset).toBe("custom");
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.filteredHistory).toHaveLength(3);
  });

  it("devuelve el mensaje vacio combinado", () => {
    const { result } = renderHook(() =>
      useTransferHistoryFilters({ transferHistory: history })
    );

    act(() => result.current.handleFolioSearchChange("NO-EXISTE"));
    act(() => result.current.handleDateChange("dateTo", new Date(2026, 9, 21)));

    expect(result.current.filteredHistory).toHaveLength(0);
    expect(result.current.emptyMessage).toBe(
      "No hay traspasos con ese folio creados en el rango seleccionado."
    );
  });
});
