import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

/*
  Contrato de paginacion del Reporte de inventario: la tabla muestra solo la
  pagina actual (25 filas por defecto), navegar cambia las filas visibles y la
  barra se oculta cuando no hay resultados.
*/

const { useInventoryReport } = vi.hoisted(() => ({
  useInventoryReport: vi.fn(),
}));

vi.mock("./hooks/useInventoryReport", () => ({ default: useInventoryReport }));

vi.mock("./hooks/useInventoryBranchDetails", () => ({
  default: () => ({
    expandedProductId: null,
    otherStocksByProduct: {},
    loadingDetailsByProduct: {},
    detailsErrorByProduct: {},
    clearExpandedProduct: vi.fn(),
    handleToggleOtherStocks: vi.fn(),
  }),
}));

vi.mock("./utils/exportInventoryReport", () => ({
  exportInventoryReport: vi.fn(),
}));

import PageReport from "./PageReport";

const buildRows = (count) =>
  Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return {
      inventoryRowId: `inv-${number}`,
      productId: `p-${number}`,
      codigo: `C${number}`,
      nombre: `PRODUCTO ${number}`,
      depto: "ALIMENTO",
      existencia: 10,
      min: 1,
      max: 20,
    };
  });

const mockReport = (rows, selectedBranchId = "b1") =>
  useInventoryReport.mockReturnValue({
    branchOptions: [
      { id: "b1", name: "Torres" },
      { id: "b2", name: "Centro" },
    ],
    selectedBranchId,
    rows,
    loading: false,
    error: "",
    handleBranchChange: vi.fn(),
  });

const getBodyRows = () => {
  const [, body] = screen.getAllByRole("rowgroup");
  return within(body).getAllByRole("row");
};

describe("PageReport paginacion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra solo la primera pagina de 25 filas", () => {
    mockReport(buildRows(30));
    render(<PageReport />);

    expect(getBodyRows()).toHaveLength(25);
    expect(screen.getByText("Página 1 de 2")).toBeTruthy();
  });

  it("cambia las filas visibles al avanzar de pagina", () => {
    mockReport(buildRows(30));
    render(<PageReport />);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(getBodyRows()).toHaveLength(5);
    expect(screen.getByText("PRODUCTO 26")).toBeTruthy();
    expect(screen.queryByText("PRODUCTO 01")).toBeNull();
  });

  it("el rango de la barra usa el total filtrado completo", () => {
    mockReport(buildRows(30));
    render(<PageReport />);

    expect(screen.getByText("Mostrando 1 a 25 de 30 productos")).toBeTruthy();
  });

  it("vuelve a la pagina 1 al aplicar un filtro que reduce el total", () => {
    const rows = buildRows(60).map((row, index) => ({
      ...row,
      existencia: index < 30 ? 5 : 10,
    }));
    mockReport(rows);
    render(<PageReport />);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Página 3 de 3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Filtrar existencia" }));
    fireEvent.change(screen.getByPlaceholderText("Ej. 7"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(screen.getByText("Página 1 de 2")).toBeTruthy();
    expect(screen.getByText("PRODUCTO 01")).toBeTruthy();
  });

  it("vuelve a la pagina 1 al cambiar de sucursal", () => {
    mockReport(buildRows(60), "b1");
    const { rerender } = render(<PageReport />);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Página 3 de 3")).toBeTruthy();

    mockReport(buildRows(30), "b2");
    rerender(<PageReport />);

    expect(screen.getByText("Página 1 de 2")).toBeTruthy();
  });

  it("oculta la barra de paginacion sin filas", () => {
    mockReport([]);
    render(<PageReport />);

    expect(screen.queryByRole("button", { name: "Siguiente" })).toBeNull();
  });
});
