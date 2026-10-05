import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/*
  Contrato del selector de sucursal del reporte de rentabilidad: el filtro
  arranca en "todas las sucursales", no se acopla a la sucursal operativa del
  cajero y limpiar filtros lo devuelve a "ALL".
*/

const { useBranch } = vi.hoisted(() => ({
  useBranch: vi.fn(() => ({
    branch: { id: "b9", name: "Merida" },
    setBranch: vi.fn(),
  })),
}));

vi.mock("../../../../contexts/BranchContext", () => ({ useBranch }));

const { useProfitabilityReport } = vi.hoisted(() => ({
  useProfitabilityReport: vi.fn(),
}));

vi.mock("./hooks/useProfitabilityReport", () => ({ useProfitabilityReport }));

vi.mock("./utils/profitabilityReportExportUtils", () => ({
  exportProfitabilityReportToExcel: vi.fn(),
}));

import PageProfitabilityReport from "./PageProfitabilityReport";

const BRANCHES = [{ id: "b1", name: "Torres" }];

describe("PageProfitabilityReport selector de sucursal", () => {
  let hookState;
  let setBranchIdSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    useBranch.mockReturnValue({
      branch: { id: "b9", name: "Merida" },
      setBranch: vi.fn(),
    });
    setBranchIdSpy = vi.fn();

    hookState = {
      branchId: "ALL",
      setBranchId: setBranchIdSpy,
      departmentId: "ALL",
      setDepartmentId: vi.fn(),
      searchTerm: "",
      setSearchTerm: vi.fn(),
      activeTab: "PRODUCTS",
      setActiveTab: vi.fn(),
      sortBy: "profit",
      sortDirection: "desc",
      handleSort: vi.fn(),
      dateRange: [new Date("2026-03-01"), new Date("2026-03-31")],
      setDateRange: vi.fn(),
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-31"),
      activeDatePreset: "this_month",
      setQuickDatePreset: vi.fn(),
      branchesList: BRANCHES,
      departmentsList: [],
      filteredProducts: [],
      filteredDepartments: [],
      criticalProducts: [],
      kpis: {},
      isLoading: false,
      error: null,
      syncedAt: null,
      refresh: vi.fn(),
    };

    useProfitabilityReport.mockImplementation(() => hookState);
  });

  const getBranchSelect = () => screen.getAllByRole("combobox")[0];

  it("arranca en todas las sucursales y lo ofrece como primera opcion", async () => {
    render(<PageProfitabilityReport />);

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Torres" })).toBeTruthy()
    );

    const select = getBranchSelect();
    const options = Array.from(select.options);

    expect(options[0].value).toBe("ALL");
    expect(options[0].textContent).toBe("Todas las sucursales");
    expect(select.value).toBe("ALL");
  });

  it("entra con la sucursal consolidada sin leer el contexto del cajero", () => {
    render(<PageProfitabilityReport />);

    expect(useProfitabilityReport).toHaveBeenCalledWith("ALL");
    expect(useBranch).not.toHaveBeenCalled();
  });

  it("vuelve a todas las sucursales al limpiar los filtros", async () => {
    hookState.branchId = "b1";

    render(<PageProfitabilityReport />);

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Torres" })).toBeTruthy()
    );
    expect(getBranchSelect().value).toBe("b1");

    fireEvent.click(screen.getByRole("button", { name: /Limpiar/ }));

    expect(setBranchIdSpy).toHaveBeenCalledWith("ALL");
    expect(useBranch).not.toHaveBeenCalled();
  });
});
