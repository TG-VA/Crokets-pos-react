import ExcelJS from "exceljs";
import { formatDynamicDate, formatCurrency, getShortFolio, formatMovementType } from "./cashReportFormatters";

/**
 * Exporta el reporte de caja a un archivo Excel (.xlsx) multisección
 */
export const exportCashReportToExcel = async ({
  sessions = [],
  movements = [],
  paymentMethods = [],
  kpis = {},
  branchName = "Todas las sucursales",
  dateRangeText = "Periodo seleccionado",
}) => {
  try {
    if ((!sessions || sessions.length === 0) && (!movements || movements.length === 0)) {
      alert("No hay datos disponibles para exportar en el periodo y filtros seleccionados.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Crokets POS";
    workbook.created = new Date();

    // ==========================================
    // HOJA 1: RESUMEN Y TURNOS DE CAJA
    // ==========================================
    const wsSessions = workbook.addWorksheet("Turnos y Cortes");

    // Título y encabezado informativo
    wsSessions.mergeCells("A1:I1");
    const titleCell = wsSessions.getCell("A1");
    titleCell.value = "CROKETS POS - REPORTE DE CAJA Y TURNOS";
    titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    wsSessions.getRow(1).height = 30;

    wsSessions.mergeCells("A2:I2");
    const metaCell = wsSessions.getCell("A2");
    metaCell.value = `Sucursal: ${branchName} | Periodo: ${dateRangeText} | Generado: ${new Date().toLocaleDateString("es-MX")}`;
    metaCell.font = { italic: true, size: 10, color: { argb: "FF475569" } };
    metaCell.alignment = { horizontal: "center", vertical: "middle" };
    wsSessions.getRow(2).height = 20;

    // Fila en blanco
    wsSessions.addRow([]);

    // KPIs Resumen
    wsSessions.addRow(["RESUMEN DE CAJA EN EL PERIODO"]);
    const kpiHeaderRow = wsSessions.getRow(4);
    kpiHeaderRow.font = { bold: true, size: 11, color: { argb: "FF1E293B" } };

    wsSessions.addRow([
      "Fondo Inicial Total:",
      kpis?.totalOpening || 0,
      "",
      "Ventas en Efectivo:",
      kpis?.totalCashSales || 0,
      "",
      "Ingresos Manuales:",
      kpis?.totalManualInflow || 0,
    ]);

    wsSessions.addRow([
      "Salidas / Retiros:",
      kpis?.totalManualOutflow || 0,
      "",
      "Efectivo Esperado:",
      kpis?.totalExpectedCash || 0,
      "",
      "Efectivo Contado:",
      kpis?.totalCountedCash || 0,
    ]);

    wsSessions.addRow([
      "Diferencia Neta:",
      kpis?.totalDifference || 0,
      "",
      "Total de Turnos:",
      kpis?.totalSessions || 0,
      "",
      "Turnos con Descuadre:",
      kpis?.sessionsWithDiscrepancy || 0,
    ]);

    // Formatear filas de KPIs (moneda en columnas B, E, H)
    [5, 6, 7].forEach((rowNum) => {
      const row = wsSessions.getRow(rowNum);
      row.font = { size: 10 };
      row.getCell(1).font = { bold: true };
      row.getCell(2).numFmt = '"$"#,##0.00';
      row.getCell(4).font = { bold: true };
      row.getCell(5).numFmt = '"$"#,##0.00';
      row.getCell(7).font = { bold: true };
      if (rowNum === 7) {
        row.getCell(8).numFmt = '#,##0';
      } else {
        row.getCell(8).numFmt = '"$"#,##0.00';
      }
    });

    wsSessions.addRow([]); // Espacio

    // Definición de columnas de la tabla de turnos
    const tableHeaderRowIndex = 9;
    const sessionHeaders = [
      "Folio Turno",
      "Fecha Apertura",
      "Fecha Cierre",
      "Sucursal",
      "Cajero / Usuario",
      "Fondo Inicial",
      "Ventas Efectivo",
      "Ventas Tarjeta",
      "Total Turno",
      "Efectivo Contado",
      "Diferencia",
      "Estado",
    ];

    wsSessions.getRow(tableHeaderRowIndex).values = sessionHeaders;
    const sHeader = wsSessions.getRow(tableHeaderRowIndex);
    sHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    sHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    sHeader.alignment = { horizontal: "center", vertical: "middle" };
    sHeader.height = 24;

    sessions.forEach((s) => {
      const diff = Number(s.difference || 0);
      const isClosed = s.status === "closed";
      const cashSales = Number(s.cashSales || 0);
      const cardSales = Number(s.cardSales || 0);
      const totalSales = Number(s.totalSales || 0);

      const row = wsSessions.addRow([
        getShortFolio(s.id),
        formatDynamicDate(s.opened_at),
        s.closed_at ? formatDynamicDate(s.closed_at) : "En curso (Abierta)",
        s.branches?.name || "Sucursal",
        s.users?.username ? String(s.users.username).toUpperCase() : "USUARIO",
        Number(s.opening_amount || 0),
        cashSales,
        cardSales,
        totalSales,
        isClosed ? Number(s.closing_amount || 0) : "N/A",
        isClosed ? diff : "N/A",
        isClosed ? "Cerrada" : "Abierta",
      ]);

      row.font = { size: 10 };
      row.getCell(6).numFmt = '"$"#,##0.00';
      row.getCell(7).numFmt = '"$"#,##0.00';
      row.getCell(8).numFmt = '"$"#,##0.00';
      row.getCell(9).numFmt = '"$"#,##0.00';
      if (isClosed) {
        row.getCell(10).numFmt = '"$"#,##0.00';
        row.getCell(11).numFmt = '"$"#,##0.00';
      }
    });

    wsSessions.columns = [
      { width: 16 }, // Folio
      { width: 18 }, // Apertura
      { width: 18 }, // Cierre
      { width: 22 }, // Sucursal
      { width: 20 }, // Cajero
      { width: 15 }, // Fondo
      { width: 16 }, // Ventas Efectivo
      { width: 16 }, // Ventas Tarjeta
      { width: 16 }, // Total Turno
      { width: 16 }, // Contado
      { width: 15 }, // Diferencia
      { width: 14 }, // Estado
    ];

    // ==========================================
    // HOJA 2: MOVIMIENTOS MANUALES (INGRESOS Y RETIROS)
    // ==========================================
    const wsMovements = workbook.addWorksheet("Movimientos de Efectivo");

    wsMovements.mergeCells("A1:G1");
    const mTitle = wsMovements.getCell("A1");
    mTitle.value = "BITÁCORA DE MOVIMIENTOS MANUALES DE CAJA (INGRESOS Y RETIROS)";
    mTitle.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    mTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    mTitle.alignment = { horizontal: "center", vertical: "middle" };
    wsMovements.getRow(1).height = 26;

    const mHeaders = [
      "Fecha / Hora",
      "Tipo",
      "Monto",
      "Concepto / Descripción",
      "Cajero / Usuario",
      "Sucursal",
      "Folio Turno",
    ];

    wsMovements.getRow(3).values = mHeaders;
    const mHeaderRow = wsMovements.getRow(3);
    mHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    mHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    mHeaderRow.alignment = { horizontal: "center", vertical: "middle" };
    mHeaderRow.height = 22;

    movements.forEach((m) => {
      const typeInfo = formatMovementType(m.movement_type);
      const row = wsMovements.addRow([
        formatDynamicDate(m.created_at),
        typeInfo.label,
        Number(m.amount || 0),
        m.description || "Sin descripción",
        m.users?.username || "Usuario",
        m.branches?.name || "Sucursal",
        getShortFolio(m.session_id),
      ]);

      row.font = { size: 10 };
      row.getCell(3).numFmt = '"$"#,##0.00';
    });

    wsMovements.columns = [
      { width: 18 }, // Fecha
      { width: 16 }, // Tipo
      { width: 16 }, // Monto
      { width: 35 }, // Descripción
      { width: 20 }, // Cajero
      { width: 22 }, // Sucursal
      { width: 16 }, // Folio
    ];

    // ==========================================
    // HOJA 3: MÉTODOS DE PAGO
    // ==========================================
    if (paymentMethods && paymentMethods.length > 0) {
      const wsPayments = workbook.addWorksheet("Métodos de Pago");

      wsPayments.mergeCells("A1:D1");
      const pTitle = wsPayments.getCell("A1");
      pTitle.value = "DESGLOSE CONSOLIDADO POR MÉTODO DE PAGO";
      pTitle.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      pTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      pTitle.alignment = { horizontal: "center", vertical: "middle" };
      wsPayments.getRow(1).height = 26;

      const pHeaders = ["Método de Pago", "Transacciones", "Total Cobrado", "% Participación"];
      wsPayments.getRow(3).values = pHeaders;
      const pHeaderRow = wsPayments.getRow(3);
      pHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      pHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
      pHeaderRow.alignment = { horizontal: "center", vertical: "middle" };

      const totalAllMethods = paymentMethods.reduce((acc, p) => acc + Number(p.amount || 0), 0);

      paymentMethods.forEach((p) => {
        const amt = Number(p.amount || 0);
        const share = totalAllMethods > 0 ? (amt / totalAllMethods) * 100 : 0;
        const row = wsPayments.addRow([
          p.methodName || "Método de pago",
          Number(p.count || 0),
          amt,
          `${share.toFixed(2)}%`,
        ]);
        row.font = { size: 10 };
        row.getCell(2).numFmt = '#,##0';
        row.getCell(3).numFmt = '"$"#,##0.00';
      });

      wsPayments.columns = [
        { width: 25 },
        { width: 16 },
        { width: 20 },
        { width: 18 },
      ];
    }

    // Generar buffer y descargar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    // Construcción del nombre del archivo: Reporte de caja [SUCURSAL] [RANGO DE FECHAS].xlsx
    const cleanBranch = (branchName || "Todas las sucursales").trim().replace(/[\/\\:*?"<>|]/g, "-");
    const formatSafeDate = (d) => {
      if (!d) return "";
      const dateObj = new Date(d);
      const day = String(dateObj.getDate()).padStart(2, "0");
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const year = dateObj.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const startStr = formatSafeDate(startDate);
    const endStr = formatSafeDate(endDate);

    let dateSegment = startStr;
    if (endStr && endStr !== startStr) {
      dateSegment = `${startStr} al ${endStr}`;
    } else if (!dateSegment) {
      dateSegment = formatSafeDate(new Date());
    }

    a.download = `Reporte de caja [${cleanBranch}] [${dateSegment}].xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Error al exportar reporte de caja a Excel:", err);
    alert("Ocurrió un error al generar el archivo Excel.");
  }
};

