import {
  formatKardexDateTime,
  getKardexMovementDescription,
  getKardexRangeLabel,
  toKardexUpperCase,
} from "../utils/kardexFormatters";

import {
  getKardexMaximumStock,
  getKardexMinimumStock,
  getKardexProductStock,
  productTracksInventory,
} from "../utils/kardexMovementUtils";

const REPORT_TITLE = "KARDEX";

const HEADER_ROW_NUMBER = 11;

const DATA_START_ROW_NUMBER = HEADER_ROW_NUMBER + 1;

const TABLE_COLUMN_COUNT = 7;

/* Primera columna de importes: costo de compra (6) e importe total (7). */
const MONEY_FIRST_COLUMN_NUMBER = 6;

/*
 * Formato de una sola seccion porque las columnas de valuacion solo reciben
 * importes mayores a cero: getKardexCostValue convierte el cero, el negativo y
 * el dato ausente en el guion largo, que viaja como texto y por lo tanto no
 * recibe numFmt. Una seccion negativa o de cero aqui seria codigo muerto.
 */
const CURRENCY_NUMBER_FORMAT = '"$"#,##0.00';

const EMPTY_VALUE_LABEL = "—";

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

const getProductName = (product) => {
  return product?.descripcion ?? product?.name ?? "—";
};

const getProductBarcode = (product) => {
  return product?.codigo ?? product?.barcode ?? product?.code ?? "SIN CÓDIGO";
};

const getProductDepartment = (product) => {
  return (
    product?.departamento ??
    product?.department_name ??
    product?.departments?.name ??
    "—"
  );
};

const configureWorksheetColumns = (worksheet) => {
  worksheet.columns = [
    {
      key: "fecha",
      width: 22,
    },
    {
      key: "descripcion",
      width: 60,
    },
    {
      key: "entradas",
      width: 14,
    },
    {
      key: "salidas",
      width: 14,
    },
    {
      key: "existencia",
      width: 16,
    },
    {
      key: "costoCompra",
      width: 16,
    },
    {
      key: "importeTotal",
      width: 16,
    },
  ];
};

const configureTitle = (worksheet) => {
  worksheet.mergeCells("A1:G1");

  const titleCell = worksheet.getCell("A1");

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

const buildInformationRows = ({ product, dateFrom, dateTo, rowsCount }) => {
  const tracksInventory = productTracksInventory(product);

  return [
    ["PRODUCTO", toKardexUpperCase(getProductName(product))],
    ["CÓDIGO", toKardexUpperCase(getProductBarcode(product))],
    ["DEPARTAMENTO", toKardexUpperCase(getProductDepartment(product))],
    [
      "EXISTENCIA ACTUAL",
      tracksInventory ? getKardexProductStock(product) : "NO APLICA",
    ],
    ["MÍNIMO", tracksInventory ? getKardexMinimumStock(product) : "NO APLICA"],
    ["MÁXIMO", tracksInventory ? getKardexMaximumStock(product) : "NO APLICA"],
    [
      "RANGO",
      getKardexRangeLabel({
        dateFrom,
        dateTo,
      }),
    ],
    ["MOVIMIENTOS EXPORTADOS", String(rowsCount)],
    ["EXPORTADO", formatKardexDateTime(new Date())],
  ];
};

const renderInformationRows = ({ worksheet, informationRows }) => {
  informationRows.forEach(([label, value], index) => {
    const rowNumber = index + 2;

    const labelCell = worksheet.getCell(`A${rowNumber}`);

    const valueCell = worksheet.getCell(`B${rowNumber}`);

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
  });
};

const configureTableHeader = (worksheet) => {
  const headerRow = worksheet.getRow(HEADER_ROW_NUMBER);

  headerRow.values = [
    "FECHA",
    "DESCRIPCIÓN / MOTIVO",
    "ENTRADAS",
    "SALIDAS",
    "EXISTENCIA",
    "COSTO COMPRA",
    "IMPORTE TOTAL",
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

/**
 * Resuelve el importe a exportar de un movimiento. Devuelve el numero cuando
 * hay costo registrado y el guion largo cuando el dato no aplica, para que en
 * Excel las celdas numericas reciban el formato de moneda y las vacias no.
 */
const getKardexCostValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return EMPTY_VALUE_LABEL;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return EMPTY_VALUE_LABEL;
  }

  return numericValue;
};

const renderKardexRows = ({ worksheet, rows }) => {
  rows.forEach((row, index) => {
    const excelRow = worksheet.getRow(DATA_START_ROW_NUMBER + index);

    excelRow.values = [
      formatKardexDateTime(row?.created_at),

      getKardexMovementDescription(row),

      row?.entryQty > 0 ? row.entryQty : null,

      row?.exitQty > 0 ? -Math.abs(row.exitQty) : null,

      row?.runningStock ?? EMPTY_VALUE_LABEL,

      getKardexCostValue(row?.unit_cost),

      getKardexCostValue(row?.total_cost),
    ];

    excelRow.height = 20;

    for (
      let columnNumber = 1;
      columnNumber <= TABLE_COLUMN_COUNT;
      columnNumber += 1
    ) {
      const cell = excelRow.getCell(columnNumber);

      const isMoneyColumn = columnNumber >= MONEY_FIRST_COLUMN_NUMBER;

      const isNumericMoney = isMoneyColumn && typeof cell.value === "number";

      cell.font = {
        name: "Arial",
      };

      cell.border = THIN_BORDER;

      if (isNumericMoney) {
        cell.numFmt = CURRENCY_NUMBER_FORMAT;
      }

      if (isMoneyColumn) {
        cell.alignment = {
          horizontal: isNumericMoney ? "left" : "center",
          vertical: "middle",
        };
      } else {
        cell.alignment =
          columnNumber >= 3
            ? {
                horizontal: "center",
                vertical: "middle",
              }
            : {
                vertical: "middle",
                wrapText: columnNumber === 2,
              };
      }

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

const configureWorksheetView = (worksheet) => {
  worksheet.autoFilter = {
    from: {
      row: HEADER_ROW_NUMBER,
      column: 1,
    },
    to: {
      row: HEADER_ROW_NUMBER,
      column: TABLE_COLUMN_COUNT,
    },
  };

  worksheet.views = [
    {
      state: "frozen",
      ySplit: HEADER_ROW_NUMBER,
      showGridLines: true,
    },
  ];

  worksheet.getColumn("entradas").numFmt = "+0;-0;";

  worksheet.getColumn("salidas").numFmt = "0;-0;";

  worksheet.getColumn("existencia").numFmt = "0";
};

export const buildKardexWorksheet = ({
  worksheet,
  product,
  rows = [],
  dateFrom = "",
  dateTo = "",
}) => {
  const normalizedRows = Array.isArray(rows) ? rows : [];

  configureWorksheetColumns(worksheet);

  configureTitle(worksheet);

  const informationRows = buildInformationRows({
    product,
    dateFrom,
    dateTo,
    rowsCount: normalizedRows.length,
  });

  renderInformationRows({
    worksheet,
    informationRows,
  });

  configureTableHeader(worksheet);

  renderKardexRows({
    worksheet,
    rows: normalizedRows,
  });

  configureWorksheetView(worksheet);

  return worksheet;
};
