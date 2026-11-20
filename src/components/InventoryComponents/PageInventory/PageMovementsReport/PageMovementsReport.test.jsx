import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

/*
  Contrato de paginacion del Reporte de movimientos: la tabla muestra solo la
  pagina actual (25 filas por defecto), cambiar filtros devuelve a la pagina 1
  y la barra se oculta cuando no hay resultados.
*/

const { useMovementsFilters, useMovementsReport } = vi.hoisted(() => ({
  useMovementsFilters: vi.fn(),
  useMovementsReport: vi.fn(),
}));

vi.mock("./hooks/useMovementsFilters", () => ({
  default: useMovementsFilters,
}));

vi.mock("./hooks/useMovementsRealtime", () => ({ default: vi.fn() }));

vi.mock("./hooks/useMovementsReport", () => ({
  default: useMovementsReport,
}));

vi.mock("./components/MovementsReportControls", () => ({
  default: () => null,
}));

vi.mock("./services/movementsExportService", () => ({
  exportMovementsReport: vi.fn(),
}));

import PageMovementsReport from "./PageMovementsReport";

const buildRows = (count) =>
  Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return {
      id: `m-${number}`,
      display_product_name: `MOVIMIENTO ${number}`,
    };
  });

const mockReport = ({
  selectedBranchId = "b1",
  startDateKey = "2026-11-13",
  endDateKey = "2026-11-13",
} = {}) =>
  useMovementsReport.mockReturnValue({
    branchOptions: [
      { id: "b1", name: "Torres" },
      { id: "b2", name: "Centro" },
    ],
    selectedBranchId,
    selectedBranchLabel: "Torres",
    startDateKey,
    endDateKey,
    startDateValue: new Date(2026, 10, 13),
    endDateValue: new Date(2026, 10, 13),
    rangePreset: "today",
    currentRange: null,
    rows: [],
    loading: false,
    error: "",
    setSelectedBranchId: vi.fn(),
    handleStartDateChange: vi.fn(),
    handleEndDateChange: vi.fn(),
    selectRangePreset: vi.fn(),
    reloadMovements: vi.fn(),
  });

const INITIAL_FILTERS = { product: null };

const mockFilters = (filteredRows, facetFilters = INITIAL_FILTERS) =>
  useMovementsFilters.mockReturnValue({
    filterableColumns: new Set(),
    facetFilters,
    facetSearch: {},
    openFacet: null,
    filteredRows,
    periodRowsCount: filteredRows.length,
    toggleFacet: vi.fn(),
    setFacetSearchValue: vi.fn(),
    clearFacetSearch: vi.fn(),
    showAllFacetValues: vi.fn(),
    showNoFacetValues: vi.fn(),
    toggleFacetValue: vi.fn(),
    isFacetValueSelected: vi.fn(() => false),
    getFacetActiveCount: vi.fn(() => 0),
    isFacetActive: vi.fn(() => false),
    getVisibleFacetOptions: vi.fn(() => []),
    resetAllFilters: vi.fn(),
  });

const getBodyRows = () => {
  const [, body] = screen.getAllByRole("rowgroup");
  return within(body).getAllByRole("row");
};

describe("PageMovementsReport paginacion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReport();
  });

  it("muestra solo la primera pagina de 25 filas", () => {
    mockFilters(buildRows(60));
    render(<PageMovementsReport />);

    expect(getBodyRows()).toHaveLength(25);
    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
  });

  it("cambia las filas visibles al avanzar de pagina", () => {
    mockFilters(buildRows(60));
    render(<PageMovementsReport />);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText("MOVIMIENTO 26")).toBeTruthy();
    expect(screen.queryByText("MOVIMIENTO 01")).toBeNull();
  });

  it("vuelve a la pagina 1 al cambiar los filtros", () => {
    const rows = buildRows(60);
    mockFilters(rows);
    const { rerender } = render(<PageMovementsReport />);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Página 2 de 3")).toBeTruthy();

    mockFilters(rows, { product: ["MOVIMIENTO 01"] });
    rerender(<PageMovementsReport />);

    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
  });

  it.each([
    ["la sucursal", { selectedBranchId: "b2" }],
    ["la fecha inicial", { startDateKey: "2026-11-01" }],
    ["la fecha final", { endDateKey: "2026-11-14" }],
  ])("vuelve a la pagina 1 al cambiar %s", (_, reportChange) => {
    mockFilters(buildRows(60));
    const { rerender } = render(<PageMovementsReport />);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Página 3 de 3")).toBeTruthy();

    mockReport(reportChange);
    mockFilters(buildRows(30));
    rerender(<PageMovementsReport />);

    expect(screen.getByText("Página 1 de 2")).toBeTruthy();
  });

  it("oculta la barra de paginacion sin filas", () => {
    mockFilters([]);
    render(<PageMovementsReport />);

    expect(screen.queryByRole("button", { name: "Siguiente" })).toBeNull();
  });
});
