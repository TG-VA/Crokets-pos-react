import { formatOrderDateTime } from "../utils/ordersFormatters";

const THIN_BORDER = {
  top: { style: "thin", color: { argb: "FFCBD5DC" } },
  left: { style: "thin", color: { argb: "FFCBD5DC" } },
  bottom: { style: "thin", color: { argb: "FFCBD5DC" } },
  right: { style: "thin", color: { argb: "FFCBD5DC" } },
};

const LIGHT_BORDER = {
  top: { style: "thin", color: { argb: "FFEEF3F6" } },
  left: { style: "thin", color: { argb: "FFEEF3F6" } },
  bottom: { style: "thin", color: { argb: "FFEEF3F6" } },
  right: { style: "thin", color: { argb: "FFEEF3F6" } },
};

const applyHeaderStyle = (row) => {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1092B1" },
    };
    cell.border = THIN_BORDER;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  });
};

const applySubHeaderStyle = (row) => {
  row.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF7FBFD" },
    };
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });
};

const applyCellBorders = (row) => {
  row.eachCell((cell) => {
    cell.border = LIGHT_BORDER;
    cell.alignment = { vertical: "middle" };
  });
};

const mergeAndStyleTitle = (worksheet, range, text) => {
  worksheet.mergeCells(range);
  const cell = worksheet.getCell(range.split(":")[0]);
  cell.value = text;
  cell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1092B1" },
  };
  cell.alignment = { vertical: "middle", horizontal: "center" };
  cell.border = THIN_BORDER;
};

const mergeAndStyleSubtitle = (
  worksheet,
  range,
  text,
  fontColor = "FFFF8A00"
) => {
  worksheet.mergeCells(range);
  const cell = worksheet.getCell(range.split(":")[0]);
  cell.value = text;
  cell.font = { bold: true, size: 12, color: { argb: fontColor } };
  cell.alignment = { vertical: "middle", horizontal: "center" };
  cell.border = THIN_BORDER;
};

export const buildOrderSummaryWorksheet = ({ worksheet, model }) => {
  if (!worksheet || !model) return worksheet;

  const { summary, totals, differences } = model;

  worksheet.columns = [
    { key: "a", width: 22 },
    { key: "b", width: 28 },
    { key: "c", width: 22 },
    { key: "d", width: 16 },
    { key: "e", width: 16 },
    { key: "f", width: 16 },
  ];

  mergeAndStyleTitle(worksheet, "A1:F2", "PEDIDO DE ABASTECIMIENTO");
  mergeAndStyleSubtitle(
    worksheet,
    "A3:F3",
    `Folio ${summary.folio || "SIN-FOLIO"} — ${summary.name || "SIN-NOMBRE"}`
  );

  worksheet.mergeCells("A4:F4");
  const statusCell = worksheet.getCell("A4");
  statusCell.value = `Estatus: ${summary.statusLabel}`;
  statusCell.font = {
    bold: true,
    color: { argb: summary.statusStyle.fontColor },
  };
  statusCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: summary.statusStyle.fill },
  };
  statusCell.alignment = { vertical: "middle", horizontal: "center" };
  statusCell.border = {
    top: { style: "thin", color: { argb: summary.statusStyle.borderColor } },
    left: { style: "thin", color: { argb: summary.statusStyle.borderColor } },
    bottom: { style: "thin", color: { argb: summary.statusStyle.borderColor } },
    right: { style: "thin", color: { argb: summary.statusStyle.borderColor } },
  };

  const addLabelValue = (
    row,
    labelA,
    valueB,
    labelD = null,
    valueE = null,
    mergeBE = false
  ) => {
    const r = worksheet.getRow(row);
    r.getCell(1).value = labelA;
    r.getCell(1).font = { bold: true };
    r.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF7FBFD" },
    };
    r.getCell(1).border = THIN_BORDER;
    if (labelD) {
      r.getCell(4).value = labelD;
      r.getCell(4).font = { bold: true };
      r.getCell(4).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF7FBFD" },
      };
      r.getCell(4).border = THIN_BORDER;
    }
    if (mergeBE && labelD) {
      worksheet.mergeCells(r.number, 2, r.number, 3);
      worksheet.mergeCells(r.number, 5, r.number, 6);
      r.getCell(2).value = valueB || "";
      r.getCell(5).value = valueE || "";
    } else if (labelD) {
      r.getCell(2).value = valueB || "";
      r.getCell(5).value = valueE || "";
      worksheet.mergeCells(r.number, 2, r.number, 3);
    } else {
      worksheet.mergeCells(r.number, 2, r.number, 6);
      r.getCell(2).value = valueB || "";
    }
    for (let c = 2; c <= 6; c += 1) {
      const cell = r.getCell(c);
      if (cell.value !== undefined && cell.value !== null) {
        cell.alignment = { vertical: "middle", wrapText: true };
        cell.border = THIN_BORDER;
      }
    }
  };

  addLabelValue(
    6,
    "Sucursal origen",
    summary.fromBranch,
    "Sucursal destino",
    summary.toBranch
  );
  addLabelValue(7, "Enviado", summary.sentAt, "Recibido", summary.acceptedAt);
  addLabelValue(
    8,
    "Generado por",
    summary.createdBy,
    "Recibido por",
    summary.receivedBy
  );
  addLabelValue(9, "Departamentos", summary.departments);
  addLabelValue(
    10,
    "Productos",
    summary.productCount,
    "Costo total",
    totals.totalCost
  );
  worksheet.getRow(10).getCell(5).numFmt = '"$"#,##0.00';
  addLabelValue(
    11,
    "Unidades esperadas",
    totals.expected,
    "Unidades recibidas",
    totals.received
  );
  worksheet.getRow(11).getCell(2).numFmt = "#,##0.####";
  worksheet.getRow(11).getCell(5).numFmt = "#,##0.####";
  addLabelValue(
    12,
    "Diferencia neta",
    summary.differenceNetLabel,
    "Estatus",
    summary.statusLabel
  );

  const diffNetCell = worksheet.getRow(12).getCell(2);
  if (summary.differenceNet < 0)
    diffNetCell.font = { color: { argb: "FFA12626" }, bold: true };
  else if (summary.differenceNet > 0)
    diffNetCell.font = { color: { argb: "FF1E6B3A" }, bold: true };

  if (differences.length > 0) {
    worksheet.mergeCells("A14:F14");
    const diffTitle = worksheet.getCell("A14");
    diffTitle.value = "DIFERENCIAS";
    diffTitle.font = { bold: true, color: { argb: "FFFFFFFF" } };
    diffTitle.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1092B1" },
    };
    diffTitle.alignment = { vertical: "middle", horizontal: "center" };
    diffTitle.border = THIN_BORDER;

    const diffHeader = worksheet.addRow([
      "Código",
      "Producto",
      "Departamento",
      "Diferencia",
    ]);
    applySubHeaderStyle(diffHeader);

    differences.forEach((item) => {
      const r = worksheet.addRow([
        item.barcode || "",
        item.productName || "",
        item.departmentName || "Sin departamento",
        item.differenceQty,
      ]);
      r.getCell(4).numFmt = "+0.####;-0.####;0";
      if (Number(item.differenceQty) < 0) {
        r.getCell(4).font = { color: { argb: "FFA12626" }, bold: true };
      } else if (Number(item.differenceQty) > 0) {
        r.getCell(4).font = { color: { argb: "FF1E6B3A" }, bold: true };
      }
      applyCellBorders(r);
    });
  }

  if (summary.notes) {
    const notesRowStart =
      differences.length > 0 ? 16 + differences.length + 1 : 14;
    worksheet.mergeCells(`A${notesRowStart}:F${notesRowStart}`);
    const notesTitle = worksheet.getCell(`A${notesRowStart}`);
    notesTitle.value = "NOTAS";
    notesTitle.font = { bold: true, color: { argb: "FFFFFFFF" } };
    notesTitle.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1092B1" },
    };
    notesTitle.alignment = { vertical: "middle", horizontal: "center" };
    notesTitle.border = THIN_BORDER;

    const notesRowNum = notesRowStart + 1;
    worksheet.mergeCells(`A${notesRowNum}:F${notesRowNum}`);
    const notesCell = worksheet.getCell(`A${notesRowNum}`);
    notesCell.value = summary.notes;
    notesCell.alignment = { vertical: "top", wrapText: true };
    notesCell.border = THIN_BORDER;
    worksheet.getRow(notesRowNum).height = 60;
  }

  if (summary.discrepancyNotes) {
    const baseRow = summary.notes
      ? differences.length > 0
        ? 16 + differences.length + 3
        : 16
      : differences.length > 0
        ? 16 + differences.length + 1
        : 14;
    worksheet.mergeCells(`A${baseRow}:F${baseRow}`);
    const discTitle = worksheet.getCell(`A${baseRow}`);
    discTitle.value = "DISCREPANCIAS";
    discTitle.font = { bold: true, color: { argb: "FFFFFFFF" } };
    discTitle.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1092B1" },
    };
    discTitle.alignment = { vertical: "middle", horizontal: "center" };
    discTitle.border = THIN_BORDER;

    const discRowNum = baseRow + 1;
    worksheet.mergeCells(`A${discRowNum}:F${discRowNum}`);
    const discCell = worksheet.getCell(`A${discRowNum}`);
    discCell.value = summary.discrepancyNotes;
    discCell.alignment = { vertical: "top", wrapText: true };
    discCell.border = THIN_BORDER;
    worksheet.getRow(discRowNum).height = 60;
  }

  worksheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3,
    },
  };
  worksheet.headerFooter = {
    oddFooter: `&LGenerado el ${formatOrderDateTime(new Date())}&RPágina &P de &N`,
  };

  return worksheet;
};

export const buildOrderItemsWorksheet = ({ worksheet, model }) => {
  if (!worksheet || !model) return worksheet;

  const { items, totals } = model;

  worksheet.columns = [
    { key: "codigo", width: 16 },
    { key: "producto", width: 40 },
    { key: "departamento", width: 24 },
    { key: "esperado", width: 14 },
    { key: "recibido", width: 14 },
    { key: "diferencia", width: 14 },
    { key: "costo", width: 16 },
    { key: "importe", width: 16 },
  ];

  const headers = [
    "Código",
    "Producto",
    "Departamento",
    "Esperado",
    "Recibido",
    "Diferencia",
    "Costo unitario",
    "Importe",
  ];
  const headerRow = worksheet.addRow(headers);
  applyHeaderStyle(headerRow);

  items.forEach((item, index) => {
    const row = worksheet.addRow([
      item.barcode || "",
      item.productName || "",
      item.departmentName || "Sin departamento",
      item.expectedQty,
      item.receivedQty,
      item.differenceQty,
      item.costPrice,
      item.importe,
    ]);
    applyCellBorders(row);
    if (index % 2 === 1) {
      row.eachCell((cell) => {
        if (!cell.fill) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF7FBFD" },
          };
        }
      });
    }
    row.getCell(4).numFmt = "#,##0.####";
    row.getCell(5).numFmt = "#,##0.####";
    row.getCell(6).numFmt = "+0.####;-0.####;0";
    row.getCell(7).numFmt = '"$"#,##0.00';
    row.getCell(8).numFmt = '"$"#,##0.00';
    if (item.differenceQty !== null && item.differenceQty < 0) {
      row.getCell(6).font = { color: { argb: "FFA12626" }, bold: true };
    } else if (item.differenceQty !== null && item.differenceQty > 0) {
      row.getCell(6).font = { color: { argb: "FF1E6B3A" }, bold: true };
    }
  });

  const totalsRow = worksheet.addRow([
    "Totales",
    "",
    "",
    totals.expected,
    totals.received,
    totals.difference,
    "",
    totals.totalCost,
  ]);
  worksheet.mergeCells(totalsRow.number, 1, totalsRow.number, 3);
  totalsRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.border = THIN_BORDER;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF7FBFD" },
    };
    cell.alignment = { vertical: "middle" };
  });
  totalsRow.getCell(4).numFmt = "#,##0.####";
  totalsRow.getCell(5).numFmt = "#,##0.####";
  totalsRow.getCell(6).numFmt = "+0.####;-0.####;0";
  totalsRow.getCell(8).numFmt = '"$"#,##0.00';
  if (totals.difference < 0)
    totalsRow.getCell(6).font = { color: { argb: "FFA12626" }, bold: true };
  else if (totals.difference > 0)
    totalsRow.getCell(6).font = { color: { argb: "FF1E6B3A" }, bold: true };

  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 8 },
  };

  worksheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3,
    },
  };
  worksheet.headerFooter = {
    oddFooter: "&LProductos&RPágina &P de &N",
  };

  return worksheet;
};

export default {
  buildOrderSummaryWorksheet,
  buildOrderItemsWorksheet,
};
