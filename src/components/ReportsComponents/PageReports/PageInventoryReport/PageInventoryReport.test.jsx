import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

/*
  Contrato del selector de sucursal del reporte de inventario: el filtro arranca
  en "todas las sucursales", solo la navegacion profunda lo acota y limpiar los
  filtros lo devuelve a "ALL" sin tocar la sucursal operativa del cajero.
*/

const { useBranch } = vi.hoisted(() => ({
  useBranch: vi.fn(() => ({
    branch: { id: "b9", name: "Merida" },
    setBranch: vi.fn(),
  })),
}));

vi.mock("../../../../contexts/BranchContext", () => ({ useBranch }));

const { fetchBranchesList } = vi.hoisted(() => ({
  fetchBranchesList: vi.fn(),
}));

vi.mock("./services/inventoryReportService", () => ({ fetchBranchesList }));

const { useInventoryReport } = vi.hoisted(() => ({
  useInventoryReport: vi.fn(),
}));

vi.mock("./hooks/useInventoryReport", () => ({ useInventoryReport }));

vi.mock("../../../../utils/exportUtils", () => ({
  exportInventoryReportToExcel: vi.fn(),
}));

import PageInventoryReport from "./PageInventoryReport";

const BRANCHES = [{ id: "b1", name: "Torres" }];

const stubInventoryReport = () => ({
  reportData: { items: [] },
  filteredItems: [],
  filteredReorder: [],
  filteredExhausted: [],
  departments: [],
  kpis: {},
  byDepartment: [],
  isLoading: false,
  error: null,
  syncedAt: null,
  selectedDepartment: "ALL",
  setSelectedDepartment: vi.fn(),
  selectedStockStatus: "ALL",
  setSelectedStockStatus: vi.fn(),
  searchTerm: "",
  setSearchTerm: vi.fn(),
  activeTab: "valuation",
  setActiveTab: vi.fn(),
});

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="location-search">{location.search}</span>;
};

const renderPage = (initialEntry = "/reports/inventario") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PageInventoryReport />
      <LocationProbe />
    </MemoryRouter>
  );

const getBranchSelect = () => screen.getAllByRole("combobox")[0];

describe("PageInventoryReport selector de sucursal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBranch.mockReturnValue({
      branch: { id: "b9", name: "Merida" },
      setBranch: vi.fn(),
    });
    fetchBranchesList.mockResolvedValue(BRANCHES);
    useInventoryReport.mockImplementation(() => stubInventoryReport());
  });

  it("arranca en todas las sucursales y lo ofrece como primera opcion", async () => {
    renderPage();

    await waitFor(() => expect(fetchBranchesList).toHaveBeenCalled());

    const select = getBranchSelect();
    const options = Array.from(select.options);

    expect(options[0].value).toBe("ALL");
    expect(options[0].textContent).toBe("Todas las sucursales");
    expect(select.value).toBe("ALL");
    expect(useInventoryReport).toHaveBeenCalledWith("ALL");
  });

  it("respeta la sucursal enviada por navegacion profunda", async () => {
    renderPage("/reports/inventario?branchId=b1");

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Torres" })).toBeTruthy()
    );

    expect(getBranchSelect().value).toBe("b1");
    expect(useInventoryReport).toHaveBeenCalledWith("b1");
    expect(useBranch).not.toHaveBeenCalled();
  });

  it("filtra por la sucursal elegida y la refleja en la url sin acoplar el contexto", async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Torres" })).toBeTruthy()
    );

    fireEvent.change(getBranchSelect(), { target: { value: "b1" } });

    expect(getBranchSelect().value).toBe("b1");
    expect(useInventoryReport).toHaveBeenLastCalledWith("b1");
    expect(screen.getByTestId("location-search").textContent).toBe(
      "?branchId=b1"
    );
    expect(useBranch).not.toHaveBeenCalled();
  });

  it("regresa a todas las sucursales y limpia la url al limpiar filtros", async () => {
    renderPage("/reports/inventario?branchId=b1");

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Torres" })).toBeTruthy()
    );

    fireEvent.click(screen.getByRole("button", { name: /Limpiar/ }));

    expect(getBranchSelect().value).toBe("ALL");
    expect(useInventoryReport).toHaveBeenLastCalledWith("ALL");
    expect(screen.getByTestId("location-search").textContent).toBe("");
  });
});