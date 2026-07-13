import ExcelJS from "exceljs";

import {
  buildRowView,
  formatMovementType,
  isNoStockMovement,
  normalizeFilenameSegment,
  toUpperSafe,
} from "../utils/movementFormatters";

import {
  formatDateKeyLabel,
  formatDateTime,
} from "../utils/movementDateUtils";

const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const REPORT_TITLE =
  "REPORTE DE MOVIMIENTOS";

const WORKSHEET_NAME =
  "MOVIMIENTOS";

const HEADER_ROW_NUMBER = 14;

const DATA_START_ROW_NUMBER =
  HEADER_ROW_NUMBER + 1;

const TABLE_COLUMN_COUNT = 9;

const THIN_BORDER = {
  top: {
    style: "thin",
    color: {
      argb: "FF000000",
    },
  },
  left: {
    style: "thin",
    color: {
      argb: "FF000000",
    },
  },
  bottom: {
    style: "thin",
    color: {
      argb: "FF000000",
    },
  },
  right: {
    style: "thin",
    color: {
      argb: "FF000000",
    },
  },
};

const getPeriodLabel = (
  rangePreset
) => {
  if (rangePreset === "today") {
    return "HOY";
  }

  if (rangePreset === "week") {
    return "ESTA SEMANA";
  }

  if (rangePreset === "month") {
    return "ESTE MES";
  }

  return "RANGO PERSONALIZADO";
};

const formatFilterSummary = (
  values,
  formatter = (value) => value
) => {
  if (values === null) {
    return "TODOS";
  }

  if (
    Array.isArray(values) &&
    values.length === 0
  ) {
    return "NINGUNO";
  }

  if (!Array.isArray(values)) {
    return "TODOS";
  }

  return values
    .map((value) => formatter(value))
    .join(", ");
};

const getRangeLabel = (
  currentRange
) => {
  if (!currentRange) {
    return "—";
  }

  const startLabel =
    formatDateKeyLabel(
      currentRange.startKey
    );

  const endLabel =
    formatDateKeyLabel(
      currentRange.endKey
    );

  if (
    currentRange.startKey ===
    currentRange.endKey
  ) {
    return startLabel;
  }

  return `${startLabel} - ${endLabel}`;
};

const getFilenameDateSegment = (
  dateKey,
  fallback = "SIN-FECHA"
) => {
  if (!dateKey) {
    return fallback;
  }

  const [year, month, day] =
    String(dateKey).split("-");

  if (!year || !month || !day) {
    return fallback;
  }

  return `${day}-${month}-${year}`;
};

const configureWorksheetColumns = (
  worksheet
) => {
  worksheet.columns = [
    {
      key: "fecha",
      width: 28,
    },
    {
      key: "producto",
      width: 34,
    },
    {
      key: "ticket",
      width: 14,
    },
    {
      key: "tipo",
      width: 18,
    },
    {
      key: "cantidad",
      width: 12,
    },
    {
      key: "anterior",
      width: 14,
    },
    {
      key: "nuevo",
      width: 14,
    },
    {
      key: "motivo",
      width: 42,
    },
    {
      key: "usuario",
      width: 16,
    },
  ];
};

const configureReportTitle = (
  worksheet
) => {
  worksheet.mergeCells("A1:I1");

  const titleCell =
    worksheet.getCell("A1");

  titleCell.value = REPORT_TITLE;

  titleCell.font = {
    bold: true,
    size: 18,
    name: "Arial",
  };

  titleCell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  worksheet.getRow(1).height = 28;
};

const buildInformationRows = ({
  branchLabel,
  rowsCount,
  rangePreset,
  currentRange,
  facetFilters,
}) => {
  return [
    [
      "SUCURSAL",
      branchLabel || "—",
    ],
    [
      "MOVIMIENTOS EXPORTADOS",
      String(rowsCount),
    ],
    [
      "PERIODO",
      getPeriodLabel(rangePreset),
    ],
    [
      "RANGO",
      getRangeLabel(currentRange),
    ],
    [
      "FILTRO PRODUCTO",
      formatFilterSummary(
        facetFilters?.product,
        (value) => toUpperSafe(value)
      ),
    ],
    [
      "FILTRO TICKET",
      formatFilterSummary(
        facetFilters?.ticket,
        (value) => toUpperSafe(value)
      ),
    ],
    [
      "FILTRO TIPO",
      formatFilterSummary(
        facetFilters?.type,
        (value) =>
          toUpperSafe(
            formatMovementType(value)
          )
      ),
    ],
    [
      "FILTRO MOTIVO",
      formatFilterSummary(
        facetFilters?.reason,
        (value) => toUpperSafe(value)
      ),
    ],
    [
      "FILTRO USUARIO",
      formatFilterSummary(
        facetFilters?.user,
        (value) => toUpperSafe(value)
      ),
    ],
    [
      "EXPORTADO",
      formatDateTime(
        new Date().toISOString()
      ),
    ],
  ];
};

const renderInformationRows = ({
  worksheet,
  informationRows,
}) => {
  informationRows.forEach(
    ([label, value], index) => {
      const rowNumber = index + 2;

      const labelCell =
        worksheet.getCell(
          `A${rowNumber}`
        );

      const valueCell =
        worksheet.getCell(
          `B${rowNumber}`
        );

      labelCell.value = label;
      valueCell.value = value;

      labelCell.font = {
        bold: true,
        name: "Arial",
      };

      valueCell.font = {
        name: "Arial",
      };

      labelCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FFF3F3F3",
        },
      };

      valueCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FFF9F9F9",
        },
      };

      labelCell.border = THIN_BORDER;
      valueCell.border = THIN_BORDER;

      labelCell.alignment = {
        vertical: "middle",
      };

      valueCell.alignment = {
        vertical: "middle",
      };
    }
  );
};

const configureTableHeader = (
  worksheet
) => {
  const headerRow =
    worksheet.getRow(
      HEADER_ROW_NUMBER
    );

  headerRow.values = [
    "FECHA",
    "PRODUCTO",
    "TICKET",
    "TIPO",
    "CANTIDAD",
    "STOCK ANTERIOR",
    "NUEVO STOCK",
    "MOTIVO",
    "USUARIO",
  ];

  headerRow.height = 22;

  headerRow.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: {
        argb: "FFFFFFFF",
      },
      name: "Arial",
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FFFC8913",
      },
    };

    cell.border = THIN_BORDER;

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
  });
};

const getStockCellValue = (
  rowView,
  stockValue
) => {
  if (isNoStockMovement(rowView)) {
    return "—";
  }

  if (
    stockValue === null ||
    stockValue === undefined
  ) {
    return "—";
  }

  return stockValue;
};

const renderMovementRows = ({
  worksheet,
  rows,
}) => {
  rows.forEach((row, index) => {
    const rowView =
      buildRowView(row);

    const excelRow =
      worksheet.getRow(
        DATA_START_ROW_NUMBER + index
      );

    excelRow.values = [
      rowView.soldAt,
      rowView.productName,
      rowView.ticket,
      rowView.typeLabel,
      rowView.qty,
      getStockCellValue(
        rowView,
        rowView.prev
      ),
      getStockCellValue(
        rowView,
        rowView.next
      ),
      rowView.reason,
      rowView.username,
    ];

    excelRow.height = 20;

    for (
      let columnNumber = 1;
      columnNumber <=
      TABLE_COLUMN_COUNT;
      columnNumber += 1
    ) {
      const cell =
        excelRow.getCell(
          columnNumber
        );

      cell.font = {
        name: "Arial",
      };

      cell.border = THIN_BORDER;

      cell.alignment =
        columnNumber >= 5 &&
        columnNumber <= 7
          ? {
              horizontal: "center",
              vertical: "middle",
            }
          : {
              vertical: "middle",
              wrapText:
                columnNumber === 2 ||
                columnNumber === 8,
            };

      if (index % 2 === 0) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FFFDF1E6",
          },
        };
      }
    }
  });
};

const configureAutoFilter = (
  worksheet
) => {
  worksheet.autoFilter = {
    from: {
      row: HEADER_ROW_NUMBER,
      column: 1,
    },
    to: {
      row: HEADER_ROW_NUMBER,
      column:
        TABLE_COLUMN_COUNT,
    },
  };
};

const configureFreezePanes = (
  worksheet
) => {
  worksheet.views = [
    {
      state: "frozen",
      ySplit: HEADER_ROW_NUMBER,
      showGridLines: true,
    },
  ];
};

const downloadWorkbook = async ({
  workbook,
  filename,
}) => {
  const output =
    await workbook.xlsx.writeBuffer();

  const blob = new Blob(
    [output],
    {
      type: EXCEL_MIME_TYPE,
    }
  );

  const objectUrl =
    URL.createObjectURL(blob);

  const downloadAnchor =
    document.createElement("a");

  downloadAnchor.href = objectUrl;
  downloadAnchor.download = filename;
  downloadAnchor.style.display = "none";

  document.body.appendChild(
    downloadAnchor
  );

  downloadAnchor.click();
  downloadAnchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(
      objectUrl
    );
  }, 1000);
};

export const exportMovementsReport = async ({
  rows,
  branchLabel,
  rangePreset = "custom",
  currentRange = null,
  facetFilters = {},
}) => {
  const normalizedRows =
    Array.isArray(rows)
      ? rows
      : [];

  const workbook =
    new ExcelJS.Workbook();

  workbook.creator = "Crokets POS";
  workbook.created = new Date();

  const worksheet =
    workbook.addWorksheet(
      WORKSHEET_NAME
    );

  configureWorksheetColumns(
    worksheet
  );

  configureReportTitle(
    worksheet
  );

  const informationRows =
    buildInformationRows({
      branchLabel,
      rowsCount:
        normalizedRows.length,
      rangePreset,
      currentRange,
      facetFilters,
    });

  renderInformationRows({
    worksheet,
    informationRows,
  });

  configureTableHeader(
    worksheet
  );

  renderMovementRows({
    worksheet,
    rows: normalizedRows,
  });

  configureAutoFilter(
    worksheet
  );

  configureFreezePanes(
    worksheet
  );

  const branchFilenameSegment =
    normalizeFilenameSegment(
      branchLabel,
      "POLIGONO"
    );

  const startDateSegment =
    getFilenameDateSegment(
      currentRange?.startKey
    );

  const endDateSegment =
    getFilenameDateSegment(
      currentRange?.endKey,
      startDateSegment
    );

  const filenameParts = [
    "MOVIMIENTOS",
    branchFilenameSegment,
    startDateSegment,
  ];

  if (
    startDateSegment !==
    endDateSegment
  ) {
    filenameParts.push(
      "A",
      endDateSegment
    );
  }

  const filename =
    filenameParts.join(" ");

  await downloadWorkbook({
    workbook,
    filename: `${filename}.xlsx`,
  });

  return {
    filename: `${filename}.xlsx`,
    exportedRows:
      normalizedRows.length,
  };
};