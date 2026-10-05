import { describe, it, expect } from "vitest";

import { render, screen } from "@testing-library/react";

import KardexTable from "./KardexTable";

import { formatKardexCurrency } from "../utils/kardexFormatters";

const buildRow = (overrides = {}) => ({
  id: "m1",
  created_at: "2026-03-01T15:30:00.000Z",
  movement_type: "purchase",
  reason: "COMPRA",
  previous_stock: 10,
  new_stock: 15,
  entryQty: 5,
  exitQty: 0,
  runningStock: 15,
  unit_cost: 120.5,
  total_cost: 602.5,
  ...overrides,
});

const getHeaderNames = () =>
  screen.getAllByRole("columnheader").map((cell) => cell.textContent);

const getBodyRowCells = (rowPosition) => {
  const row = screen.getAllByRole("row")[rowPosition];

  expect(row).toBeTruthy();

  return [...row.querySelectorAll("td")];
};

const renderTable = (rows) => render(<KardexTable rows={rows} />);

describe("KardexTable", () => {
  describe("encabezado", () => {
    it("renderiza las columnas de valuacion despues de EXISTENCIA", () => {
      renderTable([buildRow()]);

      expect(getHeaderNames()).toEqual([
        "FECHA",
        "DESCRIPCIÓN / MOTIVO",
        "ENTRADAS",
        "SALIDAS",
        "EXISTENCIA",
        "COSTO COMPRA",
        "IMPORTE TOTAL",
      ]);
    });
  });

  describe("columnas de valuacion", () => {
    it("muestra el costo de compra y el importe total formateados", () => {
      renderTable([buildRow()]);

      const cells = getBodyRowCells(1);

      expect(cells).toHaveLength(7);
      expect(cells[5].textContent).toBe(formatKardexCurrency(120.5));
      expect(cells[6].textContent).toBe(formatKardexCurrency(602.5));
    });

    it("muestra guion cuando el movimiento no registro costo", () => {
      renderTable([buildRow({ unit_cost: null, total_cost: null })]);

      const cells = getBodyRowCells(1);

      expect(cells[5].textContent).toBe("—");
      expect(cells[6].textContent).toBe("—");
    });

    it("muestra guion cuando el costo es cero", () => {
      renderTable([buildRow({ unit_cost: 0, total_cost: 0 })]);

      const cells = getBodyRowCells(1);

      expect(cells[5].textContent).toBe("—");
      expect(cells[6].textContent).toBe("—");
    });

    it("muestra guion cuando el costo no es numerico", () => {
      renderTable([buildRow({ unit_cost: "sin-dato", total_cost: NaN })]);

      const cells = getBodyRowCells(1);

      expect(cells[5].textContent).toBe("—");
      expect(cells[6].textContent).toBe("—");
    });

    it("distingue costo unitario de importe en filas independientes", () => {
      renderTable([
        buildRow({ id: "m1", unit_cost: 80, total_cost: 240 }),
        buildRow({
          id: "m2",
          entryQty: 0,
          exitQty: 2,
          runningStock: 11,
          unit_cost: null,
          total_cost: null,
        }),
      ]);

      const first = getBodyRowCells(1);
      const second = getBodyRowCells(2);

      expect(first[5].textContent).toBe(formatKardexCurrency(80));
      expect(first[6].textContent).toBe(formatKardexCurrency(240));
      expect(second[5].textContent).toBe("—");
      expect(second[6].textContent).toBe("—");
    });
  });

  describe("estados de la tabla", () => {
    it("muestra el mensaje de carga", () => {
      render(<KardexTable rows={[]} loading />);

      expect(screen.getByText("Cargando movimientos...")).toBeTruthy();
      expect(screen.queryByRole("table")).toBeNull();
    });

    it("muestra el error recibido", () => {
      render(<KardexTable rows={[]} error="No se pudo cargar" />);

      expect(screen.getByText("No se pudo cargar")).toBeTruthy();
      expect(screen.queryByRole("table")).toBeNull();
    });

    it("muestra el estado vacio sin encabezados", () => {
      renderTable([]);

      expect(screen.queryByRole("table")).toBeNull();
      expect(screen.getByText(/No hay movimientos registrados/)).toBeTruthy();
    });

    it("normaliza filas no tabulares sin romper el render", () => {
      render(<KardexTable rows={null} />);

      expect(screen.getByText(/No hay movimientos registrados/)).toBeTruthy();
    });
  });
});
