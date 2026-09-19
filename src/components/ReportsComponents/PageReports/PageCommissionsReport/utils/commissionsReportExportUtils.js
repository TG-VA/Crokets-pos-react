/**
 * commissionsReportExportUtils.js
 * Generador de archivos Excel estructurados (.xlsx) para el Reporte de Comisiones.
 */

import ExcelJS from "exceljs";
import { formatShortDate, formatDynamicDateTime } from "./commissionsReportFormatters";

/**
 * Exporta el reporte consolidado de comisiones (3 pestañas).
 */
export const exportCommissionsReportToExcel = async ({
  cashierSummaries = [],
  productSummaries = [],
  detailedRows = [],
  kpis = {},
  branchName = "Todas las sucursales",
  startDate,
  endDate,
}) => {
  try {
    const hasData =
      cashierSummaries.length > 0 || productSummaries.length > 0 || detailedRows.length > 0;

    if (!hasData) {
      alert("No hay datos de comisiones disponibles para exportar en este periodo.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Crokets POS";
    workbook.created = new Date();

    // ==========================================
    // HOJA 1: RESUMEN Y LIQUIDACIÓN POR CAJERO
    // ==========================================
    const wsCashiers = workbook.addWorksheet("Liquidación por Cajero");

    // Título
    wsCashiers.mergeCells("A1:G1");
    const title1 = wsCashiers.getCell("A1");
    title1.value = "CROKETS POS - REPORTE DE COMISIONES POR CAJERO";
    title1.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    title1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0284C7" } };
    title1.alignment = { horizontal: "center", vertical: "middle" };
    wsCashiers.getRow(1).height = 32;

    // Metadatos
    wsCashiers.addRow(["Periodo:", `${formatShortDate(startDate)} al ${formatShortDate(endDate)}`]);
    wsCashiers.addRow(["Sucursal:", branchName]);
    wsCashiers.addRow(["Total Comisiones Periodo:", kpis.totalCommissions || 0]);
    wsCashiers.addRow(["Venta Total Comisionable:", kpis.totalCommissionableSales || 0]);
    wsCashiers.addRow([]);

    // Formatos de metadatos
    wsCashiers.getCell("B4").numFmt = '"$"#,##0.00';
    wsCashiers.getCell("B5").numFmt = '"$"#,##0.00';

    // Encabezados de tabla
    const headerRow1 = wsCashiers.addRow([
      "Cajero",
      "Sucursal Principal",
      "Tickets con Comisión",
      "Piezas Vendidas",
      "Venta Comisionable",
      "Comisión Total Devengada",
      "Promedio por Ticket",
    ]);

    headerRow1.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    headerRow1.alignment = { horizontal: "center", vertical: "middle" };
    wsCashiers.getRow(headerRow1.number).height = 24;

    cashierSummaries.forEach((c) => {
      const row = wsCashiers.addRow([
        c.cashierName,
        c.branchName,
        c.ticketsCount,
        c.totalUnits,
        c.totalSales,
        c.totalCommission,
        c.averageCommissionPerTicket,
      ]);

      row.getCell(5).numFmt = '"$"#,##0.00';
      row.getCell(6).numFmt = '"$"#,##0.00';
      row.getCell(7).numFmt = '"$"#,##0.00';
    });

    wsCashiers.columns = [
      { width: 28 },
      { width: 22 },
      { width: 20 },
      { width: 16 },
      { width: 20 },
      { width: 24 },
      { width: 20 },
    ];

    // ==========================================
    // HOJA 2: POR PRODUCTO COMISIONABLE
    // ==========================================
    const wsProducts = workbook.addWorksheet("Productos Comisionables");

    wsProducts.mergeCells("A1:G1");
    const title2 = wsProducts.getCell("A1");
    title2.value = "CROKETS POS - COMISIONES GENERADAS POR PRODUCTO";
    title2.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    title2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0284C7" } };
    title2.alignment = { horizontal: "center", vertical: "middle" };
    wsProducts.getRow(1).height = 32;

    wsProducts.addRow([]);
    const headerRow2 = wsProducts.addRow([
      "Código de Barras",
      "Producto",
      "Departamento",
      "Regla Comisión",
      "Piezas Vendidas",
      "Venta Generada",
      "Comisión Total Pagada",
    ]);

    headerRow2.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    headerRow2.alignment = { horizontal: "center", vertical: "middle" };
    wsProducts.getRow(headerRow2.number).height = 24;

    productSummaries.forEach((p) => {
      const row = wsProducts.addRow([
        p.barcode,
        p.productName,
        p.departmentName,
        p.ruleLabel,
        p.totalUnits,
        p.totalSales,
        p.totalCommission,
      ]);

      row.getCell(6).numFmt = '"$"#,##0.00';
      row.getCell(7).numFmt = '"$"#,##0.00';
    });

    wsProducts.columns = [
      { width: 18 },
      { width: 34 },
      { width: 20 },
      { width: 16 },
      { width: 16 },
      { width: 18 },
      { width: 22 },
    ];

    // ==========================================
    // HOJA 3: AUDITORÍA DE PARTIDAS
    // ==========================================
    const wsAudit = workbook.addWorksheet("Auditoría Partida por Partida");

    wsAudit.mergeCells("A1:K1");
    const title3 = wsAudit.getCell("A1");
    title3.value = "CROKETS POS - AUDITORÍA DETALLADA DE COMISIONES";
    title3.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    title3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0284C7" } };
    title3.alignment = { horizontal: "center", vertical: "middle" };
    wsAudit.getRow(1).height = 32;

    wsAudit.addRow([]);
    const headerRow3 = wsAudit.addRow([
      "Folio Ticket",
      "Fecha y Hora",
      "Cajero",
      "Sucursal",
      "Producto",
      "Regla Comisión",
      "Cantidad",
      "Precio Unit.",
      "Descuento",
      "Total Partida",
      "Comisión Generada",
    ]);

    headerRow3.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    headerRow3.alignment = { horizontal: "center", vertical: "middle" };
    wsAudit.getRow(headerRow3.number).height = 24;

    detailedRows
      .filter((r) => r.hasCommission)
      .forEach((r) => {
        const ruleText =
          r.commissionType === "percent" || r.commissionType === "percentage"
            ? `${Number(r.commissionValue || 0)}% s/venta`
            : `$${Number(r.commissionValue || 0).toFixed(2)} / pz`;

        const row = wsAudit.addRow([
          r.ticketNumber,
          formatDynamicDateTime(r.createdAt),
          r.cashierName,
          r.branchName,
          r.productName,
          ruleText,
          r.quantity,
          r.unitPrice,
          r.discountAmount || 0,
          r.totalPrice,
          r.commissionAmount,
        ]);

        row.getCell(8).numFmt = '"$"#,##0.00';
        row.getCell(9).numFmt = '"$"#,##0.00';
        row.getCell(10).numFmt = '"$"#,##0.00';
        row.getCell(11).numFmt = '"$"#,##0.00';
      });

    wsAudit.columns = [
      { width: 16 },
      { width: 22 },
      { width: 22 },
      { width: 18 },
      { width: 34 },
      { width: 18 },
      { width: 12 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 20 },
    ];

    // Descargar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;

    const cleanBranch = branchName.replace(/[\/\\:*?"<>|]/g, "_").slice(0, 20);
    anchor.download = `Reporte_Comisiones_[${cleanBranch}]_[${formatShortDate(startDate).replace(/\//g, "-")}_al_${formatShortDate(endDate).replace(/\//g, "-")}].xlsx`;
    anchor.style.display = "none";
    document.body.appendChild(anchor);

    try {
      anchor.click();
    } finally {
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    }
  } catch (error) {
    console.error("Error al exportar reporte de comisiones a Excel:", error);
    alert("Ocurrió un error al generar el archivo Excel de comisiones.");
  }
};

/**
 * Exporta el recibo individual de liquidación de un cajero.
 */
export const exportCashierStatementToExcel = async ({
  cashierName,
  ticketGroups = [],
  startDate,
  endDate,
}) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Crokets POS";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("Comprobante Cajero");

    ws.mergeCells("A1:G1");
    const title = ws.getCell("A1");
    title.value = `COMPROBANTE DE COMISIONES - ${cashierName.toUpperCase()}`;
    title.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
    title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0284C7" } };
    title.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 30;

    ws.addRow(["Cajero:", cashierName]);
    ws.addRow(["Periodo:", `${formatShortDate(startDate)} al ${formatShortDate(endDate)}`]);
    ws.addRow([]);

    const header = ws.addRow([
      "Ticket",
      "Fecha",
      "Producto",
      "Cantidad",
      "Precio Venta",
      "Total Venta",
      "Comisión",
    ]);

    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    header.alignment = { horizontal: "center", vertical: "middle" };

    let grandTotalCommission = 0;
    ticketGroups.forEach((ticket) => {
      ticket.items.forEach((item) => {
        grandTotalCommission += item.commissionAmount;
        const row = ws.addRow([
          ticket.ticketNumber,
          formatDynamicDateTime(ticket.createdAt),
          item.productName,
          item.quantity,
          item.unitPrice,
          item.totalPrice,
          item.commissionAmount,
        ]);
        row.getCell(5).numFmt = '"$"#,##0.00';
        row.getCell(6).numFmt = '"$"#,##0.00';
        row.getCell(7).numFmt = '"$"#,##0.00';
      });
    });

    ws.addRow([]);
    const totalRow = ws.addRow(["TOTAL A PAGAR:", "", "", "", "", "", grandTotalCommission]);
    totalRow.font = { bold: true, size: 11 };
    totalRow.getCell(7).numFmt = '"$"#,##0.00';

    ws.columns = [
      { width: 16 },
      { width: 22 },
      { width: 34 },
      { width: 12 },
      { width: 16 },
      { width: 16 },
      { width: 18 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;

    anchor.download = `Recibo_Comisiones_${cashierName.replace(/\s+/g, "_")}.xlsx`;
    anchor.style.display = "none";
    document.body.appendChild(anchor);

    try {
      anchor.click();
    } finally {
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    }
  } catch (error) {
    console.error("Error al exportar recibo de cajero:", error);
    alert("Ocurrió un error al generar el comprobante del cajero.");
  }
};
