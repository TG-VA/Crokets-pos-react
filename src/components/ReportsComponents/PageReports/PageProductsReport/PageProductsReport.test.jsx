import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/*
  Contrato del selector de sucursal del reporte de productos: el filtro es
  analitico, arranca en "todas las sucursales" y no lee ni escribe la sucursal
  operativa del cajero desde `BranchContext`.
*/

const { useBranch } = vi.hoisted(() => ({
  useBranch: vi.fn(() => ({
    branch: { id: "b9", name: "Merida" },
    setBranch: vi.fn(),
  })),
}));

vi.mock("../../../../contexts/BranchContext", () => ({ useBranch }));

const { useProductsReport } = vi.hoisted(() => ({
  useProductsReport: vi.fn(),
}));

vi.mock("./hooks/useProductsReport", () => ({ useProductsReport }));

vi.mock("../../../../lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => {
      const branches = [{ id: "b1", name: "Torres" }];
      const query = {
        select: vi.fn(),
        order: vi.fn(),
        then: (resolve) =>
          Promise.resolve({ data: branches, error: null }).then(resolve),
      };
      query.select.mockReturnValue(query);
      query.order.mockReturnValue(query);
      return query;
    }),
  },
}));

vi.mock("../../../../utils/exportUtils", () => ({
  exportFullReportToExcel: vi.fn(),
}));

import PageProductsReport from "./PageProductsReport";

const stubReport = {
  dateRange: { startDate: "2026-03-01", endDate: "2026-03-31" },
  setDateRange: vi.fn(),
  reportData: { kpis: {}, byDepartment: [], topProducts: [] },
  isLoading: false,
  error: null,
  syncedAt: null,
  generateReport: vi.fn(),
};

const getBranchSelect = () => screen.getByRole("combobox");

describe("PageProductsReport selector de sucursal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBranch.mockReturnValue({
      branch: { id: "b9", name: "Merida" },
      setBranch: vi.fn(),
    });
    useProductsReport.mockImplementation(() => stubReport);
  });

  it("arranca en todas las sucursales y lo ofrece como primera opcion", () => {
    render(<PageProductsReport />);

    const select = getBranchSelect();
    const options = Array.from(select.options);

    expect(options[0].value).toBe("ALL");
    expect(options[0].textContent).toBe("Todas las sucursales");
    expect(select.value).toBe("ALL");
  });

  it("consulta el reporte con la sucursal consolidada en el montaje", async () => {
    render(<PageProductsReport />);

    await waitFor(() => expect(useProductsReport).toHaveBeenCalled());
    expect(useProductsReport.mock.calls[0][0]).toBe("ALL");

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Torres" })).toBeTruthy()
    );
    expect(getBranchSelect().value).toBe("ALL");
  });

  it("no consulta el contexto de sucursal operativa del cajero", () => {
    render(<PageProductsReport />);

    expect(useBranch).not.toHaveBeenCalled();
  });

  it("filtra por la sucursal elegida sin mutar la sucursal global", async () => {
    render(<PageProductsReport />);

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Torres" })).toBeTruthy()
    );

    fireEvent.change(getBranchSelect(), { target: { value: "b1" } });

    expect(getBranchSelect().value).toBe("b1");
    expect(useProductsReport).toHaveBeenLastCalledWith("b1");
    expect(useBranch).not.toHaveBeenCalled();
  });
});
