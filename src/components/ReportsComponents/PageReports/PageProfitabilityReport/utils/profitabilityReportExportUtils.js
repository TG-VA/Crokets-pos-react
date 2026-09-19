/**
 * profitabilityReportExportUtils.js
 * Exportación a Excel (.xlsx) para el Reporte de Rentabilidad.
 */

import ExcelJS from "exceljs";
import { formatShortDate } from "./profitabilityReportFormatters";

export const exportProfitabilityReportToExcel = async ({
  productsProfitability = [],
  departmentsProfitability = [],
  criticalProducts = [],
  kpis = {},
  branchName = "Todas las sucursales",
  activeTab = "PRODUCTS",
  departmentName = "Todos los departamentos",
  startDate = null,
  endDate = null,
  searchTerm = "",
}) => {
  try {
    const hasData =
      productsProfitability.length > 0 ||
      departmentsProfitability.length > 0;

    if (!hasData) {
      alert("No hay datos de rentabilidad disponibles para exportar con los filtros seleccionados.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Crokets POS";
    workbook.created = new Date();

    let activeSheetIndex = 0;
    if (activeTab === "DEPARTMENTS") activeSheetIndex = 1;
    if (activeTab === "CRITICAL") activeSheetIndex = 2;

    workbook.views = [
      {
        x: 0,
        y: 0,
        width: 10000,
        height: 20000,
        firstSheet: 0,
        activeTab: activeSheetIndex,
        visibility: "visible",
      },
    ];

    const dateSubtext =
      startDate && endDate
        ? `Periodo: ${formatShortDate(startDate)} al ${formatShortDate(endDate)}`
        : "Periodo: Histórico";

    // ==========================================
    // HOJA 1: RENTABILIDAD POR PRODUCTO
    // ==========================================
    const wsProducts = workbook.addWorksheet("Rentabilidad por Producto");

    wsProducts.mergeCells("A1:J1");
    const title1 = wsProducts.getCell("A1");
    title1.value = "CROKETS POS - REPORTE DE RENTABILIDAD POR PRODUCTO";
    title1.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    title1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    title1.alignment = { horizontal: "center", vertical: "middle" };
    wsProducts.getRow(1).height = 30;

    wsProducts.mergeCells("A2:J2");
    const meta1 = wsProducts.getCell("A2");
    meta1.value = `Sucursal: ${branchName} | Departamento: ${departmentName} | ${dateSubtext} | Generado: ${new Date().toLocaleDateString("es-MX")}`;
    meta1.font = { italic: true, size: 10, color: { argb: "FF475569" } };
    meta1.alignment = { horizontal: "center", vertical: "middle" };
    wsProducts.getRow(2).height = 20;

    wsProducts.addRow([]); // Fila 3 vacía

    // Resumen de KPIs
    wsProducts.addRow(["RESUMEN DE RENTABILIDAD"]);
    wsProducts.getRow(4).font = { bold: true, size: 11, color: { argb: "FF1E293B" } };

    wsProducts.addRow([
      "Venta Neta (Ingresos):",
      kpis.totalRevenue || 0,
      "",
      "Costo de Ventas (COGS):",
      kpis.totalCost || 0,
      "",
      "Utilidad Bruta ($):",
      kpis.grossProfit || 0,
      "",
      "Margen Bruto Global:",
      `${(kpis.grossMarginPercent || 0).toFixed(1)}%`,
    ]);

    wsProducts.getRow(5).font = { size: 9, bold: true };
    wsProducts.getCell("B5").numFmt = '"$"#,##0.00';
    wsProducts.getCell("E5").numFmt = '"$"#,##0.00';
    wsProducts.getCell("H5").numFmt = '"$"#,##0.00';

    wsProducts.addRow([]); // Fila 6 vacía

    // Encabezados de tabla
    const prodHeaders = [
      "Código",
      "Producto",
      "Departamento",
      "Unidades Vendidas",
      "Precio Prom. Venta",
      "Costo Unit. Prom.",
      "Ingreso Total ($)",
      "Costo Total ($)",
      "Utilidad Bruta ($)",
      "Margen Bruto (%)",
    ];

    const prodHeaderRow = wsProducts.addRow(prodHeaders);
    prodHeaderRow.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    prodHeaderRow.height = 24;

    prodHeaderRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });

    for (const p of productsProfitability) {
      let displayName = p.productName;
      if (p.isPureReward) {
        displayName += " (Promoción / Regalo)";
      } else if (p.hasPartialReward) {
        displayName += ` (Incluye ${p.redeemedUnits} en promo/regalo)`;
      } else if (p.isKit) {
        displayName += " (Kit)";
      }

      const row = wsProducts.addRow([
        p.barcode || "S/C",
        displayName,
        p.departmentName || "Sin Departamento",
        p.totalUnits,
        p.averageSalePrice,
        p.averageCostPrice,
        p.totalRevenue,
        p.totalCost,
        p.grossProfit,
        p.grossMarginPercent / 100, // Formato porcentaje en Excel
      ]);

      row.font = { size: 9 };
      row.getCell(1).alignment = { horizontal: "center" };
      row.getCell(4).alignment = { horizontal: "center" };
      row.getCell(4).numFmt = "#,##0";
      row.getCell(5).numFmt = '"$"#,##0.00';
      row.getCell(6).numFmt = '"$"#,##0.00';
      row.getCell(7).numFmt = '"$"#,##0.00';
      row.getCell(8).numFmt = '"$"#,##0.00';
      row.getCell(9).numFmt = '"$"#,##0.00';
      row.getCell(10).numFmt = "0.0%";

      // Resaltar canje de lealtad, margen negativo o crítico
      if (p.isPureReward) {
        row.getCell(9).font = { bold: true, color: { argb: "FF7C3AED" } };
        row.getCell(10).font = { bold: true, color: { argb: "FF7C3AED" } };
      } else if (p.isLoss) {
        row.getCell(9).font = { bold: true, color: { argb: "FFDC2626" } };
        row.getCell(10).font = { bold: true, color: { argb: "FFDC2626" } };
      } else if (p.isCritical) {
        row.getCell(10).font = { bold: true, color: { argb: "FFD97706" } };
      }
    }

    wsProducts.columns = [
      { width: 16 },
      { width: 36 },
      { width: 22 },
      { width: 16 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
    ];

    // ==========================================
    // HOJA 2: RENTABILIDAD POR DEPARTAMENTO
    // ==========================================
    const wsDept = workbook.addWorksheet("Por Departamento");

    wsDept.mergeCells("A1:G1");
    const title2 = wsDept.getCell("A1");
    title2.value = "CROKETS POS - RENTABILIDAD POR DEPARTAMENTO";
    title2.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    title2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0284C7" } };
    title2.alignment = { horizontal: "center", vertical: "middle" };
    wsDept.getRow(1).height = 30;

    wsDept.mergeCells("A2:G2");
    const meta2 = wsDept.getCell("A2");
    meta2.value = `Sucursal: ${branchName} | ${dateSubtext} | Generado: ${new Date().toLocaleDateString("es-MX")}`;
    meta2.font = { italic: true, size: 10, color: { argb: "FF475569" } };
    meta2.alignment = { horizontal: "center", vertical: "middle" };
    wsDept.getRow(2).height = 20;

    wsDept.addRow([]);

    const deptHeaders = [
      "Departamento",
      "Variedad Productos",
      "Unidades Vendidas",
      "Ingresos Totales ($)",
      "Costo de Ventas ($)",
      "Utilidad Bruta ($)",
      "Margen Bruto (%)",
    ];

    const deptHeaderRow = wsDept.addRow(deptHeaders);
    deptHeaderRow.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    deptHeaderRow.height = 24;

    deptHeaderRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0369A1" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    for (const d of departmentsProfitability) {
      const row = wsDept.addRow([
        d.departmentName,
        d.productsCount,
        d.totalUnits,
        d.totalRevenue,
        d.totalCost,
        d.grossProfit,
        d.grossMarginPercent / 100,
      ]);

      row.font = { size: 9 };
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(3).alignment = { horizontal: "center" };
      row.getCell(4).numFmt = '"$"#,##0.00';
      row.getCell(5).numFmt = '"$"#,##0.00';
      row.getCell(6).numFmt = '"$"#,##0.00';
      row.getCell(7).numFmt = "0.0%";
    }

    wsDept.columns = [
      { width: 28 },
      { width: 18 },
      { width: 18 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 18 },
    ];

    // ==========================================
    // HOJA 3: MARGEN CRÍTICO
    // ==========================================
    const wsCritical = workbook.addWorksheet("Margen Crítico");

    wsCritical.mergeCells("A1:G1");
    const title3 = wsCritical.getCell("A1");
    title3.value = "CROKETS POS - PRODUCTOS CON MARGEN CRÍTICO (< 15% O PÉRDIDA)";
    title3.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    title3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
    title3.alignment = { horizontal: "center", vertical: "middle" };
    wsCritical.getRow(1).height = 30;

    wsCritical.mergeCells("A2:G2");
    const meta3 = wsCritical.getCell("A2");
    meta3.value = `Productos que requieren revisión de precios o negociación con proveedores | ${dateSubtext}`;
    meta3.font = { italic: true, size: 10, color: { argb: "FF475569" } };
    meta3.alignment = { horizontal: "center", vertical: "middle" };
    wsCritical.getRow(2).height = 20;

    wsCritical.addRow([]);

    const critHeaders = [
      "Código",
      "Producto",
      "Departamento",
      "Unidades Vendidas",
      "Total Ingreso ($)",
      "Total Costo ($)",
      "Margen Bruto (%)",
    ];

    const critHeaderRow = wsCritical.addRow(critHeaders);
    critHeaderRow.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    critHeaderRow.height = 24;

    critHeaderRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF991B1B" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    for (const c of criticalProducts) {
      const row = wsCritical.addRow([
        c.barcode || "S/C",
        c.productName + (c.isPureReward ? " (Promoción / Regalo)" : c.hasPartialReward ? ` (Incluye ${c.redeemedUnits} en promo/regalo)` : c.isKit ? " (Kit)" : ""),
        c.departmentName || "Sin Departamento",
        c.totalUnits,
        c.totalRevenue,
        c.totalCost,
        c.grossMarginPercent / 100,
      ]);

      row.font = { size: 9 };
      row.getCell(1).alignment = { horizontal: "center" };
      row.getCell(4).alignment = { horizontal: "center" };
      row.getCell(5).numFmt = '"$"#,##0.00';
      row.getCell(6).numFmt = '"$"#,##0.00';
      row.getCell(7).numFmt = "0.0%";
      row.getCell(7).font = {
        bold: true,
        color: { argb: c.isPureReward ? "FF7C3AED" : "FFDC2626" },
      };
    }

    wsCritical.columns = [
      { width: 16 },
      { width: 36 },
      { width: 22 },
      { width: 16 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
    ];

    // ==========================================
    // DESCARGA EN CLIENTE CON NOMBRE DINÁMICO
    // ==========================================
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;

    const parts = ["Reporte Rentabilidad"];
    if (activeTab === "PRODUCTS") parts.push("[Por Producto]");
    if (activeTab === "DEPARTMENTS") parts.push("[Por Departamento]");
    if (activeTab === "CRITICAL") parts.push("[Margen Critico]");

    parts.push(`[${branchName.replace(/\s+/g, "_")}]`);

    if (startDate && endDate) {
      const startStr = formatShortDate(startDate).replace(/\//g, "-");
      const endStr = formatShortDate(endDate).replace(/\//g, "-");
      parts.push(`[${startStr}_al_${endStr}]`);
    }

    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    parts.push(`[${day}-${month}-${year}]`);

    anchor.download = `${parts.join(" ")}.xlsx`;
    anchor.style.display = "none";
    document.body.appendChild(anchor);

    try {
      anchor.click();
    } finally {
      anchor.remove();
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 60000);
    }
  } catch (err) {
    console.error("Error al exportar reporte de rentabilidad a Excel:", err);
    alert("Ocurrió un error al generar el archivo Excel.");
  }
};
