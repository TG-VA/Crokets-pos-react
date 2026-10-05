import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/*
  Contrato del selector de sucursal del reporte de clientes: el filtro arranca en
  "todas las sucursales", no se acopla a la sucursal operativa del cajero y el
  restablecer del filtro vuelve a "ALL".
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

vi.mock("./services/customersReportService", () => ({ fetchBranchesList }));

vi.mock("./hooks/useCustomersReport", () => ({
  useCustomersReport: vi.fn(),
}));

vi.mock("./hooks/useCustomerDetail", () => ({
  useCustomerDetail: () => ({
    customerDetail: null,
    loadingDetail: false,
    errorDetail: null,
    isDetailOpen: false,
    openCustomerDetail: vi.fn(),
    closeCustomerDetail: vi.fn(),
  }),
}));

vi.mock("./utils/customersReportExportUtils", () => ({
  exportCustomersReportToExcel: vi.fn(),
}));

import PageCustomersReport from "./PageCustomersReport";

const BRANCHES = [{ id: "b1", name: "Torres" }];

const EMPTY_KPIS = {
  activeCustomersCount: 0,
  totalSpentSum: 0,
  averageTicket: 0,
  averageFrequency: 0,
  totalPointsBalance: 0,
  totalPointsEarned: 0,
  totalPointsRedeemed: 0,
  totalRewardsDiscount: 0,
  atRiskCount: 0,
};

describe("PageCustomersReport selector de sucursal", () => {
  let hookState;
  let setBranchIdSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    useBranch.mockReturnValue({
      branch: { id: "b9", name: "Merida" },
      setBranch: vi.fn(),
    });
    fetchBranchesList.mockResolvedValue(BRANCHES);
    setBranchIdSpy = vi.fn();

    hookState = {
      branchId: "ALL",
      setBranchId: setBranchIdSpy,
      customerType: "ALL",
      setCustomerType: vi.fn(),
      searchTerm: "",
      setSearchTerm: vi.fn(),
      activeTab: "RANKING",
      setActiveTab: vi.fn(),
      riskFilter: "ALL",
      setRiskFilter: vi.fn(),
      sortBy: "spent",
      sortDirection: "desc",
      handleSort: vi.fn(),
      reportData: { rankedCustomers: [], topProducts: [], redemptionsList: [], kpis: EMPTY_KPIS },
      filteredCustomers: [],
      filteredTopProducts: [],
      filteredRedemptions: [],
      kpis: EMPTY_KPIS,
      isLoading: false,
      error: null,
      syncedAt: null,
      refresh: vi.fn(),
    };
  });

  const getBranchSelect = () => screen.getAllByRole("combobox")[0];

  it("arranca en todas las sucursales y lo ofrece como primera opcion", async () => {
    const { useCustomersReport } = await import("./hooks/useCustomersReport");
    useCustomersReport.mockImplementation(() => hookState);

    render(<PageCustomersReport />);

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Torres" })).toBeTruthy()
    );

    const select = getBranchSelect();
    const options = Array.from(select.options);

    expect(options[0].value).toBe("ALL");
    expect(options[0].textContent).toBe("Todas las sucursales");
    expect(select.value).toBe("ALL");
  });

  it("entra con la sucursal consolidada sin leer el contexto del cajero", async () => {
    const { useCustomersReport } = await import("./hooks/useCustomersReport");
    useCustomersReport.mockImplementation(() => hookState);

    render(<PageCustomersReport />);

    await waitFor(() => expect(useCustomersReport).toHaveBeenCalled());

    expect(useCustomersReport).toHaveBeenCalledWith("ALL");
    expect(useBranch).not.toHaveBeenCalled();
  });

  it("regresa a todas las sucursales al restablecer los filtros", async () => {
    const { useCustomersReport } = await import("./hooks/useCustomersReport");
    hookState.branchId = "b1";
    useCustomersReport.mockImplementation(() => hookState);

    render(<PageCustomersReport />);

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Torres" })).toBeTruthy()
    );
    expect(getBranchSelect().value).toBe("b1");

    fireEvent.click(screen.getByRole("button", { name: /Restablecer|limpiar/i }));

    expect(setBranchIdSpy).toHaveBeenCalledWith("ALL");
    expect(useBranch).not.toHaveBeenCalled();
  });
});
