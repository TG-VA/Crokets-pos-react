import { describe, it, expect, beforeEach, vi } from "vitest";

import { render, screen, fireEvent } from "@testing-library/react";

import PageKardex from "./Pagekardex";

const MOVEMENTS_TOTAL = 25;

const PAGE_SIZE = 10;

const SALES_TOTAL = 5;

const { exportKardexReport, kardexState } = vi.hoisted(() => {
  const isSale = (index) => index % 5 === 0;

  const buildRow = (index) => ({
    id: `m${index}`,
    created_at: `2026-03-${String((index % 28) + 1).padStart(2, "0")}T15:30:00.000Z`,
    movement_type: isSale(index) ? "sale" : "purchase",
    reason: `LOTE ${index}`,
    entryQty: isSale(index) ? 0 : 5,
    exitQty: isSale(index) ? 1 : 0,
    runningStock: 10 + index,
    unit_cost: 100,
    total_cost: 500,
  });

  const selectedProduct = { id: "p1", nombre: "ALIMENTO PERRO", minimo: 2 };

  return {
    exportKardexReport: vi.fn(async () => {}),
    kardexState: {
      products: [selectedProduct],

      selectedProducts: [selectedProduct, null],
      selectedProductIds: ["p1"],

      modalTargetSlot: 0,
      searchModalOpen: false,
      barcode: "",

      draftDateFrom: "",
      draftDateTo: "",
      appliedDateFrom: "",
      appliedDateTo: "",
      dateFilterError: "",
      isDateFilterActive: false,

      movementsState: { 0: { loading: false, error: "" } },
      rowsBySlot: [Array.from({ length: 25 }, (_, index) => buildRow(index))],

      setBarcode: vi.fn(),
      setDraftDateFrom: vi.fn(),
      setDraftDateTo: vi.fn(),

      openProductSearch: vi.fn(),
      closeProductSearch: vi.fn(),
      selectProduct: vi.fn(),
      removeProduct: vi.fn(),
      searchBarcode: vi.fn(),

      applyDateFilter: vi.fn(),
      clearDateFilter: vi.fn(),
    },
  };
});

vi.mock("./services/kardexExportService", () => ({ exportKardexReport }));

vi.mock("./hooks/useKardex", () => ({ default: () => kardexState }));

vi.mock("./hooks/useKardexRemoveConfirmation", () => ({
  default: () => ({
    removeConfirmation: { isOpen: false, title: "", message: "" },
    requestRemoveProduct: vi.fn(),
    confirmRemoveProduct: vi.fn(),
    closeRemoveConfirmation: vi.fn(),
  }),
}));

const countRenderedDataRows = () =>
  screen.getAllByRole("row").filter((row) => row.closest("tbody")).length;

describe("PageKardex exportacion", () => {
  beforeEach(() => {
    exportKardexReport.mockClear();
    exportKardexReport.mockResolvedValue(undefined);
  });

  it("entrega al exportador el dataset completo y no la pagina visible", () => {
    render(<PageKardex />);

    expect(countRenderedDataRows()).toBe(PAGE_SIZE);

    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    expect(exportKardexReport).toHaveBeenCalledTimes(1);

    const payload = exportKardexReport.mock.calls[0][0];

    expect(payload.rows).toHaveLength(MOVEMENTS_TOTAL);
    expect(payload.rows[0].reason).toBe("LOTE 0");
    expect(payload.rows[MOVEMENTS_TOTAL - 1].reason).toBe(
      `LOTE ${MOVEMENTS_TOTAL - 1}`
    );
    expect(payload.product).toEqual(kardexState.selectedProducts[0]);
  });

  it("exporta el dataset completo incluso desde la ultima pagina", () => {
    render(<PageKardex />);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText("Página 3 de 3")).toBeTruthy();
    expect(countRenderedDataRows()).toBe(5);

    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    expect(exportKardexReport).toHaveBeenCalledTimes(1);

    expect(exportKardexReport.mock.calls[0][0].rows).toHaveLength(
      MOVEMENTS_TOTAL
    );
  });

  it("con filtro por tipo exporta lo filtrado y vuelve a la pagina 1", () => {
    render(<PageKardex />);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText("Página 2 de 3")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Tipo"), {
      target: { value: "sale" },
    });

    expect(screen.getByText("Página 1 de 1")).toBeTruthy();
    expect(countRenderedDataRows()).toBe(SALES_TOTAL);

    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    const payload = exportKardexReport.mock.calls[0][0];

    expect(payload.rows).toHaveLength(SALES_TOTAL);
    expect(payload.rows.length).toBeLessThan(payload.rangeRows.length);
    expect(payload.rows.every((row) => row.movement_type === "sale")).toBe(
      true
    );
    expect(payload.rangeRows).toHaveLength(MOVEMENTS_TOTAL);
  });
});

describe("PageKardex buscador de productos", () => {
  it("muestra la carga del inventario en el buscador", () => {
    Object.assign(kardexState, {
      searchModalOpen: true,
      loadingProducts: true,
    });

    try {
      render(<PageKardex />);

      expect(screen.getByText("Cargando inventario...")).toBeTruthy();
    } finally {
      Object.assign(kardexState, {
        searchModalOpen: false,
        loadingProducts: false,
      });
    }
  });

  it("muestra el error de productos en el buscador", () => {
    Object.assign(kardexState, {
      searchModalOpen: true,
      productsError: "Error al cargar",
    });

    try {
      render(<PageKardex />);

      expect(screen.getByText("Error al cargar")).toBeTruthy();
    } finally {
      Object.assign(kardexState, {
        searchModalOpen: false,
        productsError: null,
      });
    }
  });
});
