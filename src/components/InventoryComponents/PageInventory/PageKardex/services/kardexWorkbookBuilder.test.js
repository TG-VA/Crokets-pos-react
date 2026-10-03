import { describe, it, expect, beforeEach } from "vitest";

import ExcelJS from "exceljs";

import { buildKardexWorksheet } from "./kardexWorkbookBuilder";

const HEADER_ROW_NUMBER = 11;

const DATA_START_ROW_NUMBER = 12;

const CURRENCY_NUMBER_FORMAT = '"$"#,##0.00;[Red]"-$"#,##0.00;"$0.00"';

const product = {
  descripcion: "ALIMENTO PERRO ADULTO 15KG",
  codigo: "AP0015",
  departamento: "ALIMENTOS",
  existencia: 40,
  minimo: 5,
  maximo: 60,
  tracks_inventory: true,
};

const buildRow = (overrides = {}) => ({
  id: "m1",
  created_at: "2026-03-01T15:30:00.000Z",
  movement_type: "purchase",
  reason: "LOTE 1",
  entryQty: 5,
  exitQty: 0,
  runningStock: 40,
  unit_cost: 120.5,
  total_cost: 602.5,
  ...overrides,
});

const buildWorksheet = ({ rows = [], overrides = {} } = {}) => {
  const workbook = new ExcelJS.Workbook();

  const worksheet = workbook.addWorksheet("KARDEX");

  buildKardexWorksheet({
    worksheet,
    product,
    rows,
    dateFrom: "2026-03-01",
    dateTo: "2026-03-31",
    ...overrides,
  });

  return worksheet;
};

const getColumnKeys = (worksheet) =>
  worksheet.columns.map((column) => column.key);

const getHeaderValues = (worksheet) => {
  const headerRow = worksheet.getRow(HEADER_ROW_NUMBER);

  return headerRow.values.slice(1);
};

describe("kardexWorkbookBuilder", () => {
  let worksheet;

  beforeEach(() => {
    worksheet = buildWorksheet({ rows: [buildRow()] });
  });

  describe("estructura del worksheet", () => {
    it("define las siete columnas con sus anchos", () => {
      expect(worksheet.columns).toHaveLength(7);

      expect(getColumnKeys(worksheet)).toEqual([
        "fecha",
        "descripcion",
        "entradas",
        "salidas",
        "existencia",
        "costoCompra",
        "importeTotal",
      ]);

      expect(worksheet.getColumn("costoCompra").width).toBe(16);
      expect(worksheet.getColumn("importeTotal").width).toBe(16);
    });

    it("centra el titulo sobre las siete columnas", () => {
      expect(worksheet.model.merges).toContain("A1:G1");

      expect(worksheet.getCell("A1").isMerged).toBe(true);
      expect(worksheet.getCell("A1").value).toBe("KARDEX");
      expect(worksheet.getCell("A1").alignment.horizontal).toBe("center");
    });

    it("escribe los siete encabezados de la tabla", () => {
      expect(getHeaderValues(worksheet)).toEqual([
        "FECHA",
        "DESCRIPCIÓN / MOTIVO",
        "ENTRADAS",
        "SALIDAS",
        "EXISTENCIA",
        "COSTO COMPRA",
        "IMPORTE TOTAL",
      ]);
    });

    it("extiende el autofiltro hasta la septima columna", () => {
      expect(worksheet.autoFilter).toEqual({
        from: { row: HEADER_ROW_NUMBER, column: 1 },
        to: { row: HEADER_ROW_NUMBER, column: 7 },
      });
    });

    it("conserva los formatos numericos de las columnas de cantidad", () => {
      expect(worksheet.getColumn("entradas").numFmt).toBe("+0;-0;");
      expect(worksheet.getColumn("salidas").numFmt).toBe("0;-0;");
      expect(worksheet.getColumn("existencia").numFmt).toBe("0");
    });
  });

  describe("columnas de valuacion", () => {
    it("escribe el costo de compra y el importe total como numeros", () => {
      const row = worksheet.getRow(DATA_START_ROW_NUMBER);

      expect(row.values.slice(1)).toHaveLength(7);
      expect(row.getCell(6).value).toBe(120.5);
      expect(row.getCell(7).value).toBe(602.5);
    });

    it("aplica el formato de moneda y la alineacion izquierda al importe", () => {
      const row = worksheet.getRow(DATA_START_ROW_NUMBER);

      const costCell = row.getCell(6);
      const totalCell = row.getCell(7);

      expect(costCell.numFmt).toBe(CURRENCY_NUMBER_FORMAT);
      expect(totalCell.numFmt).toBe(CURRENCY_NUMBER_FORMAT);

      expect(costCell.alignment).toEqual({
        horizontal: "left",
        vertical: "middle",
      });
      expect(totalCell.alignment).toEqual({
        horizontal: "left",
        vertical: "middle",
      });
    });

    it("convierte a numero los importes enviados como texto", () => {
      const textoWorksheet = buildWorksheet({
        rows: [buildRow({ unit_cost: "80", total_cost: "240" })],
      });

      const row = textoWorksheet.getRow(DATA_START_ROW_NUMBER);

      expect(row.getCell(6).value).toBe(80);
      expect(row.getCell(7).value).toBe(240);
      expect(row.getCell(6).numFmt).toBe(CURRENCY_NUMBER_FORMAT);
    });

    it("escribe el guion largo y centra la celda cuando el costo no aplica", () => {
      const sinCosto = buildWorksheet({
        rows: [
          buildRow({
            unit_cost: null,
            total_cost: null,
          }),
        ],
      });

      const row = sinCosto.getRow(DATA_START_ROW_NUMBER);

      expect(row.getCell(6).value).toBe("—");
      expect(row.getCell(7).value).toBe("—");
      expect(row.getCell(6).numFmt).toBeUndefined();
      expect(row.getCell(6).alignment).toEqual({
        horizontal: "center",
        vertical: "middle",
      });
      expect(row.getCell(7).alignment).toEqual({
        horizontal: "center",
        vertical: "middle",
      });
    });

    it("trata como no aplicable el costo cero, negativo o no numerico", () => {
      const atipico = buildWorksheet({
        rows: [
          buildRow({ unit_cost: 0, total_cost: 0 }),
          buildRow({ unit_cost: -15, total_cost: -75 }),
          buildRow({ unit_cost: "sin-dato", total_cost: NaN }),
        ],
      });

      [0, 1, 2].forEach((offset) => {
        const row = atipico.getRow(DATA_START_ROW_NUMBER + offset);

        expect(row.getCell(6).value).toBe("—");
        expect(row.getCell(7).value).toBe("—");
      });
    });
  });

  describe("formato de las filas de datos", () => {
    it("respeta la fuente Arial y el borde en las siete celdas", () => {
      const row = worksheet.getRow(DATA_START_ROW_NUMBER);

      for (let columnNumber = 1; columnNumber <= 7; columnNumber += 1) {
        const cell = row.getCell(columnNumber);

        expect(cell.font).toEqual({ name: "Arial" });
        expect(cell.border).toBeDefined();
        expect(cell.border.top.style).toBe("thin");
      }
    });

    it("mantiene el cebreado alternado y el centrado previo", () => {
      const row = worksheet.getRow(DATA_START_ROW_NUMBER);

      expect(row.getCell(1).fill.fgColor.argb).toBe("FFFDF1E6");
      expect(row.getCell(3).alignment.horizontal).toBe("center");
      expect(row.getCell(2).alignment.wrapText).toBe(true);

      const segundaFila = buildWorksheet({
        rows: [buildRow(), buildRow({ id: "m2" })],
      });

      expect(
        segundaFila.getRow(DATA_START_ROW_NUMBER + 1).getCell(1).fill
      ).toBeUndefined();
    });

    it("exporta las salidas como valores negativos", () => {
      const conSalida = buildWorksheet({
        rows: [buildRow({ entryQty: 0, exitQty: 3, runningStock: 32 })],
      });

      const row = conSalida.getRow(DATA_START_ROW_NUMBER);

      expect(row.getCell(3).value).toBeNull();
      expect(row.getCell(4).value).toBe(-3);
      expect(row.getCell(5).value).toBe(32);
    });
  });

  describe("entradas inválidas", () => {
    it("genera la estructura aunque no haya movimientos", () => {
      const vacio = buildWorksheet({ rows: [] });

      expect(vacio.columns).toHaveLength(7);
      expect(getHeaderValues(vacio)).toHaveLength(7);
      expect(vacio.getCell("B9").value).toBe("0");
    });

    it("tolera filas no tabulares", () => {
      const invalido = buildWorksheet({ rows: null });

      expect(invalido.columns).toHaveLength(7);
      expect(invalido.getCell("B9").value).toBe("0");
    });

    it("reporta el producto sin control de inventario", () => {
      const sinControl = buildWorksheet({
        rows: [],
        overrides: {
          product: { ...product, tracks_inventory: false },
        },
      });

      expect(sinControl.getCell("B5").value).toBe("NO APLICA");
      expect(sinControl.getCell("B6").value).toBe("NO APLICA");
      expect(sinControl.getCell("B7").value).toBe("NO APLICA");
    });
  });
});
