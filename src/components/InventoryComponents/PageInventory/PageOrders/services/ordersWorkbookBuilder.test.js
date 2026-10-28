import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";

import {
  buildOrderExportFilename,
  buildOrderItemRows,
  buildOrderTotals,
  buildOrderDifferences,
  getOrderStatusStyle,
  buildOrderExportModel,
} from "./ordersExportExcelModel";
import {
  buildOrderSummaryWorksheet,
  buildOrderItemsWorksheet,
} from "./ordersWorkbookBuilder";

const baseOrder = {
  orderNumber: "PED-0012",
  orderName: "Reposicion Mayo",
  status: "accepted_with_difference",
  fromBranchName: "Matriz",
  toBranchName: "Sucursal Norte",
  sentAt: "2026-10-24T10:00:00.000Z",
  acceptedAt: "2026-10-24T12:30:00.000Z",
  createdByLabel: "Juan",
  receivedByLabel: "Ana",
  departments: ["ALIMENTOS"],
  notes: "Revisar faltantes",
  discrepancyNotes: "Algunos productos llegaron incompletos",
  receiptNotes: "Faltó una bolsa de alimento",
  items: [
    {
      barcode: "AP0015",
      productName: "Alimento Perro Adulto",
      departmentName: "ALIMENTOS",
      expectedQty: 10,
      receivedQty: 8,
      differenceQty: -2,
      costPrice: 120.5,
    },
    {
      barcode: "AP0020",
      productName: "Alimento Gato Adulto",
      departmentName: "ALIMENTOS",
      expectedQty: 5,
      receivedQty: 6,
      differenceQty: 1,
      costPrice: 85,
    },
  ],
};

describe("ordersExportExcelModel", () => {
  it("buildOrderExportFilename usa nombre del pedido y no repite folio", () => {
    const filename = buildOrderExportFilename(baseOrder);
    expect(filename).toMatch(/^Pedido_/);
    expect(filename).toContain("Reposicion-Mayo");
    expect(filename).toContain("PED-0012");
    expect(filename).not.toMatch(/Pedido_PED-0012_PED-0012/);
  });

  it("buildOrderExportFilename sin nombre usa SIN-NOMBRE", () => {
    const filename = buildOrderExportFilename({ orderNumber: "PED-0001" });
    expect(filename).toContain("SIN-NOMBRE");
    expect(filename).toContain("PED-0001");
  });

  it("buildOrderItemRows calcula importes sin agregar una columna tipo", () => {
    const rows = buildOrderItemRows(baseOrder);
    expect(rows).toHaveLength(2);
    expect(rows[0].importe).toBeCloseTo(1205);
    expect(rows[0]).not.toHaveProperty("tipo");
    expect(rows[1].importe).toBeCloseTo(425);
    expect(rows[1]).not.toHaveProperty("tipo");
  });

  it("buildOrderDifferences devuelve solo codigo, producto, departamento y diferencia", () => {
    const diffs = buildOrderDifferences(baseOrder);
    expect(diffs).toHaveLength(2);
    expect(diffs[0]).toEqual({
      barcode: "AP0015",
      productName: "Alimento Perro Adulto",
      departmentName: "ALIMENTOS",
      differenceQty: -2,
    });
  });

  it("buildOrderTotals suma correctamente", () => {
    const totals = buildOrderTotals(baseOrder);
    expect(totals.expected).toBe(15);
    expect(totals.received).toBe(14);
    expect(totals.difference).toBe(-1);
    expect(totals.totalCost).toBeCloseTo(1630);
  });

  it("getOrderStatusStyle devuelve estilo para accepted_with_difference", () => {
    const style = getOrderStatusStyle("accepted_with_difference");
    expect(style.label).toBe("Aceptado con diferencia");
  });

  it("buildOrderExportModel retorna dos hojas de datos", () => {
    const model = buildOrderExportModel(baseOrder);
    expect(model).not.toBeNull();
    expect(model.items).toHaveLength(2);
    expect(model.differences).toHaveLength(2);
    expect(model.totals.totalCost).toBeCloseTo(1630);
  });
});

describe("ordersWorkbookBuilder", () => {
  it("buildOrderSummaryWorksheet genera hoja resumen sin lanzar error", async () => {
    const model = buildOrderExportModel(baseOrder);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Resumen");
    buildOrderSummaryWorksheet({ worksheet, model });
    expect(worksheet.name).toBe("Resumen");
    expect(worksheet.getCell("A1").value).toBe("PEDIDO DE ABASTECIMIENTO");
  });

  it("incluye la nota de recepcion en el resumen exportado", () => {
    const model = buildOrderExportModel(baseOrder);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Resumen");
    buildOrderSummaryWorksheet({ worksheet, model });

    expect(model.summary.receiptNotes).toBe("Faltó una bolsa de alimento");
    expect(worksheet.getCell("A13").value).toBe("Nota de recepción");
    expect(worksheet.getCell("B13").value).toBe("Faltó una bolsa de alimento");
  });

  it("buildOrderSummaryWorksheet incluye footer con fecha", () => {
    const model = buildOrderExportModel(baseOrder);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Resumen");
    buildOrderSummaryWorksheet({ worksheet, model });
    expect(worksheet.headerFooter.oddFooter).toContain("Generado el");
  });

  it("buildOrderItemsWorksheet genera hoja productos con filtros y congelado", () => {
    const model = buildOrderExportModel(baseOrder);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Productos");
    buildOrderItemsWorksheet({ worksheet, model });
    expect(worksheet.name).toBe("Productos");
    expect(worksheet.views?.[0]?.ySplit).toBe(1);
    expect(worksheet.autoFilter).toBeTruthy();
    const header = worksheet.getRow(1).values.slice(1);
    expect(header).toEqual([
      "Código",
      "Producto",
      "Departamento",
      "Esperado",
      "Recibido",
      "Diferencia",
      "Costo unitario",
      "Importe",
    ]);
    expect(worksheet.columnCount).toBe(8);
    expect(worksheet.autoFilter.to).toEqual({ row: 1, column: 8 });
  });

  it("buildOrderSummaryWorksheet agrega diferencias con cuatro columnas", () => {
    const model = buildOrderExportModel(baseOrder);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Resumen");
    buildOrderSummaryWorksheet({ worksheet, model });

    expect(worksheet.getRow(15).values.slice(1)).toEqual([
      "Código",
      "Producto",
      "Departamento",
      "Diferencia",
    ]);
    expect(worksheet.getRow(16).values.slice(1)).toEqual([
      "AP0015",
      "Alimento Perro Adulto",
      "ALIMENTOS",
      -2,
    ]);
    expect(worksheet.getCell("D16").numFmt).toBe("+0.####;-0.####;0");
    expect(worksheet.getCell("D16").font.color.argb).toBe("FFA12626");
    expect(worksheet.getCell("D17").font.color.argb).toBe("FF1E6B3A");
  });
});
