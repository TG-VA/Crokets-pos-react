/**
 * customersReportExportUtils.js
 * Exportación a Excel (.xlsx) estructurado para el Reporte de Clientes.
 */

import ExcelJS from "exceljs";
import { formatShortDate, formatDynamicDate } from "./customersReportFormatters";

export const exportCustomersReportToExcel = async ({
  rankedCustomers = [],
  topProducts = [],
  redemptionsList = [],
  kpis = {},
  branchName = "Todas las sucursales",
  activeTab = "RANKING",
  customerType = "ALL",
  riskFilter = "ALL",
  searchTerm = "",
}) => {
  try {
    const hasAnyData =
      (rankedCustomers && rankedCustomers.length > 0) ||
      (topProducts && topProducts.length > 0) ||
      (redemptionsList && redemptionsList.length > 0);

    if (!hasAnyData) {
      alert("No hay datos disponibles para exportar con los filtros seleccionados.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Crokets POS";
    workbook.created = new Date();

    // Activar en Excel la pestaña correspondiente a la vista actual
    let activeSheetIndex = 0;
    if (activeTab === "PRODUCTS") activeSheetIndex = 1;
    if (activeTab === "REWARDS") activeSheetIndex = 2;

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

    // ==========================================
    // HOJA 1: RANKING Y MÉTRICAS DE CLIENTES
    // ==========================================
    const wsRanking = workbook.addWorksheet("Ranking de Clientes");

    // Título institucional
    wsRanking.mergeCells("A1:J1");
    const titleCell = wsRanking.getCell("A1");
    titleCell.value = "CROKETS POS - REPORTE DE CLIENTES";
    titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    wsRanking.getRow(1).height = 30;

    // Subtítulo con metadata
    wsRanking.mergeCells("A2:J2");
    const metaCell = wsRanking.getCell("A2");
    metaCell.value = `Sucursal: ${branchName} | Historial General de Clientes | Generado: ${new Date().toLocaleDateString("es-MX")}`;
    metaCell.font = { italic: true, size: 10, color: { argb: "FF475569" } };
    metaCell.alignment = { horizontal: "center", vertical: "middle" };
    wsRanking.getRow(2).height = 20;

    wsRanking.addRow([]); // Fila 3 en blanco

    // Resumen de KPIs en bloque
    wsRanking.addRow(["RESUMEN GENERAL"]);
    wsRanking.getRow(4).font = { bold: true, size: 11, color: { argb: "FF1E293B" } };

    wsRanking.addRow([
      "Clientes con Compras:",
      kpis?.activeCustomersCount || 0,
      "",
      "Total Facturado a Clientes:",
      kpis?.totalSpentSum || 0,
      "",
      "Ticket Promedio:",
      kpis?.averageTicket || 0,
    ]);

    wsRanking.addRow([
      "Frecuencia Promedio:",
      kpis?.averageFrequency || 0,
      "",
      "Puntos Ganados:",
      kpis?.pointsEarnedInPeriod || 0,
      "",
      "Puntos Canjeados:",
      kpis?.pointsRedeemedInPeriod || 0,
    ]);

    wsRanking.addRow([
      "Descuento en Recompensas:",
      kpis?.totalRewardsDiscount || 0,
      "",
      "Clientes en Riesgo (>30d):",
      kpis?.atRiskCount || 0,
    ]);

    // Formatear filas de KPIs
    [5, 6, 7].forEach((rowIdx) => {
      const row = wsRanking.getRow(rowIdx);
      row.height = 20;
      row.getCell(1).font = { bold: true, color: { argb: "FF64748B" } };
      row.getCell(4).font = { bold: true, color: { argb: "FF64748B" } };
      row.getCell(7).font = { bold: true, color: { argb: "FF64748B" } };

      if (rowIdx === 5) {
        row.getCell(5).numFmt = '"$"#,##0.00';
        row.getCell(8).numFmt = '"$"#,##0.00';
      }
      if (rowIdx === 6) {
        row.getCell(2).numFmt = '0.0';
        row.getCell(5).numFmt = '#,##0';
        row.getCell(8).numFmt = '#,##0';
      }
      if (rowIdx === 7) {
        row.getCell(2).numFmt = '"$"#,##0.00';
        row.getCell(5).numFmt = '#,##0';
      }
    });

    wsRanking.addRow([]); // Fila 8 en blanco

    // Encabezados de tabla de clientes
    const tableHeader = [
      "Cliente",
      "Teléfono",
      "Email",
      "Tipo",
      "Compras (Visitas)",
      "Total Gastado",
      "Ticket Promedio",
      "Puntos Saldo",
      "Recompensas Usadas",
      "Última Compra",
    ];
    wsRanking.addRow(tableHeader);
    const tblHeaderRow = wsRanking.getRow(9);
    tblHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    tblHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0284C7" } };
    tblHeaderRow.alignment = { horizontal: "center", vertical: "middle" };
    tblHeaderRow.height = 25;

    // Filas de clientes
    rankedCustomers.forEach((c) => {
      const typeLabel = c.isPointsCustomer && c.isBillingCustomer
        ? "Puntos y Facturación"
        : c.isPointsCustomer
        ? "Programa Puntos"
        : c.isBillingCustomer
        ? "Facturación"
        : "Estándar";

      const lastVisitText = c.lastSaleDate ? formatShortDate(c.lastSaleDate) : "Sin compras";

      const row = wsRanking.addRow([
        c.name,
        c.phone || "S/T",
        c.email || "S/E",
        typeLabel,
        c.purchasesCount,
        c.totalSpent,
        c.averageTicket,
        c.pointsBalance,
        c.rewardsRedeemedCount,
        lastVisitText,
      ]);

      row.height = 20;
      row.getCell(5).alignment = { horizontal: "center" };
      row.getCell(6).numFmt = '"$"#,##0.00';
      row.getCell(6).alignment = { horizontal: "right" };
      row.getCell(7).numFmt = '"$"#,##0.00';
      row.getCell(7).alignment = { horizontal: "right" };
      row.getCell(8).numFmt = '#,##0';
      row.getCell(8).alignment = { horizontal: "right" };
      row.getCell(9).alignment = { horizontal: "center" };
      row.getCell(10).alignment = { horizontal: "center" };
    });

    wsRanking.columns = [
      { width: 28 }, // Cliente
      { width: 16 }, // Teléfono
      { width: 24 }, // Email
      { width: 20 }, // Tipo
      { width: 18 }, // Compras
      { width: 18 }, // Total Gastado
      { width: 18 }, // Ticket Promedio
      { width: 16 }, // Puntos Saldo
      { width: 20 }, // Recompensas Usadas
      { width: 16 }, // Última Compra
    ];

    // ==========================================
    // HOJA 2: PRODUCTOS MÁS COMPRADOS
    // ==========================================
    const wsProducts = workbook.addWorksheet("Productos Más Comprados");

    wsProducts.mergeCells("A1:G1");
    const pTitle = wsProducts.getCell("A1");
    pTitle.value = "PRODUCTOS MÁS COMPRADOS POR CLIENTES IDENTIFICADOS";
    pTitle.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    pTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    pTitle.alignment = { horizontal: "center", vertical: "middle" };
    wsProducts.getRow(1).height = 28;

    const prodHeaders = [
      "Código de Barras",
      "Producto",
      "Unidades Vendidas",
      "Tickets (Veces Vendido)",
      "Ingreso Acumulado",
      "Compradores Únicos",
      "Promedio por Cliente",
    ];
    wsProducts.addRow(prodHeaders);
    const pHeaderRow = wsProducts.getRow(2);
    pHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    pHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0284C7" } };
    pHeaderRow.alignment = { horizontal: "center", vertical: "middle" };
    pHeaderRow.height = 24;

    topProducts.forEach((p) => {
      const avgPerCustomer =
        p.uniqueCustomersCount > 0
          ? Number((p.quantity / p.uniqueCustomersCount).toFixed(1))
          : 0;

      const row = wsProducts.addRow([
        p.barcode || "S/C",
        p.productName,
        p.quantity,
        p.ticketsCount || 0,
        p.revenue,
        p.uniqueCustomersCount,
        avgPerCustomer,
      ]);
      row.height = 20;
      row.getCell(3).numFmt = '#,##0';
      row.getCell(3).alignment = { horizontal: "right" };
      row.getCell(4).numFmt = '#,##0';
      row.getCell(4).alignment = { horizontal: "center" };
      row.getCell(5).numFmt = '"$"#,##0.00';
      row.getCell(5).alignment = { horizontal: "right" };
      row.getCell(6).alignment = { horizontal: "center" };
      row.getCell(7).numFmt = '#,##0.0';
      row.getCell(7).alignment = { horizontal: "right" };
    });

    wsProducts.columns = [
      { width: 20 },
      { width: 45 },
      { width: 18 },
      { width: 24 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
    ];

    // ==========================================
    // HOJA 3: RECOMPENSAS Y CANJES
    // ==========================================
    const wsRewards = workbook.addWorksheet("Canjes de Recompensas");

    wsRewards.mergeCells("A1:I1");
    const rTitle = wsRewards.getCell("A1");
    rTitle.value = "REGISTRO DE RECOMPENSAS REDIMIDAS EN EL PERIODO";
    rTitle.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    rTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    rTitle.alignment = { horizontal: "center", vertical: "middle" };
    wsRewards.getRow(1).height = 28;

    const rewHeaders = [
      "Fecha y Hora Canje",
      "Ticket (Folio)",
      "Sucursal",
      "Cliente",
      "Recompensa / Premio",
      "Producto Aplicado",
      "Cantidad Canjeada",
      "Puntos Usados",
      "Descuento Bonificado",
    ];
    wsRewards.addRow(rewHeaders);
    const rHeaderRow = wsRewards.getRow(2);
    rHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    rHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0284C7" } };
    rHeaderRow.alignment = { horizontal: "center", vertical: "middle" };
    rHeaderRow.height = 24;

    redemptionsList.forEach((r) => {
      const shortFolio = r.sale_id ? r.sale_id.substring(0, 8).toUpperCase() : "S/F";
      const row = wsRewards.addRow([
        formatDynamicDate(r.created_at, r.timezone),
        `#${shortFolio}`,
        r.branch_name || "Sucursal",
        r.customer_name || "Cliente General",
        r.reward_name || "Recompensa",
        r.product_name || "N/A",
        Number(r.quantity || 1),
        r.total_points || 0,
        r.discount_amount || 0,
      ]);
      row.height = 20;
      row.getCell(1).alignment = { horizontal: "center" };
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(3).alignment = { horizontal: "left" };
      row.getCell(4).alignment = { horizontal: "left" };
      row.getCell(5).alignment = { horizontal: "left" };
      row.getCell(6).alignment = { horizontal: "left" };
      row.getCell(7).alignment = { horizontal: "center" };
      row.getCell(7).numFmt = '#,##0';
      row.getCell(8).alignment = { horizontal: "right" };
      row.getCell(8).numFmt = '#,##0';
      row.getCell(9).alignment = { horizontal: "right" };
      row.getCell(9).numFmt = '"$"#,##0.00';
    });

    wsRewards.columns = [
      { width: 22 },
      { width: 16 },
      { width: 20 },
      { width: 30 },
      { width: 28 },
      { width: 32 },
      { width: 18 },
      { width: 16 },
      { width: 22 },
    ];

    // ==========================================
    // GENERAR BUFFER Y DESCARGA
    // ==========================================
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;

    // Construcción del nombre de archivo dinámico
    let tabLabel = "Ranking de Clientes";
    if (activeTab === "PRODUCTS") {
      tabLabel = "Productos Más Comprados";
    } else if (activeTab === "REWARDS") {
      tabLabel = "Canjes de Recompensas";
    }

    const cleanBranch = (branchName || "Todas las sucursales")
      .trim()
      .replace(/[\/\\:*?"<>|]/g, "-");

    const parts = [`Reporte de Clientes - ${tabLabel}`, `[${cleanBranch}]`];

    // Tags contextuales para el Ranking
    if (activeTab === "RANKING") {
      if (customerType === "POINTS") parts.push("[Puntos]");
      if (customerType === "BILLING") parts.push("[Facturación]");

      if (riskFilter === "ACTIVE_ONLY") parts.push("[Activos Recientes]");
      if (riskFilter === "RISK_ONLY") parts.push("[En Riesgo-Inactivos]");
    }

    // Tag si el usuario tiene una búsqueda activa
    if (searchTerm && searchTerm.trim()) {
      const cleanTerm = searchTerm
        .trim()
        .replace(/[\/\\:*?"<>|]/g, "-")
        .slice(0, 20);
      parts.push(`[Filtro '${cleanTerm}']`);
    }

    // Fecha del día
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
    console.error("Error al exportar reporte de clientes a Excel:", err);
    alert("Ocurrió un error al generar el archivo Excel.");
  }
};
