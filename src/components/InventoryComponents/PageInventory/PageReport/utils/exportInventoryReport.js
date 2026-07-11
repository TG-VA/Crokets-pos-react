import ExcelJS from "exceljs";

import {
  formatDateTime,
  toUpperSafe,
  formatInventoryValue,
  formatDateForFilename,
  normalizeFilenameSegment,
  getExistenceFilterLabel,
} from "./inventoryReportUtils";

export const exportInventoryReport = async ({
  filteredRows = [],
  facetFilters = {
    nombre: [],
    depto: [],
    existencia: [],
  },
  selectedBranchLabel = "—",
}) => {
  if (!Array.isArray(filteredRows) || filteredRows.length === 0) {
    return;
  }

  const workbook = new ExcelJS.Workbook();

  const worksheet = workbook.addWorksheet("INVENTARIO", {
    views: [{ showGridLines: true }],
  });

  worksheet.columns = [
    { key: "codigo", width: 31 },
    { key: "nombre", width: 45 },
    { key: "depto", width: 24 },
    { key: "existencia", width: 17 },
    { key: "min", width: 12 },
    { key: "max", width: 12 },
  ];

  worksheet.mergeCells("A1:F1");

  const titleCell = worksheet.getCell("A1");

  titleCell.value = "REPORTE DE INVENTARIO";

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

  const appliedNameFilter =
    Array.isArray(facetFilters.nombre) &&
    facetFilters.nombre.length > 0
      ? facetFilters.nombre
          .map((value) => toUpperSafe(value))
          .join(", ")
      : "TODOS";

  const appliedDepartmentFilter =
    Array.isArray(facetFilters.depto) &&
    facetFilters.depto.length > 0
      ? facetFilters.depto
          .map((value) => toUpperSafe(value))
          .join(", ")
      : "TODOS";

  const appliedInventoryFilter =
    Array.isArray(facetFilters.existencia) &&
    facetFilters.existencia.length > 0
      ? facetFilters.existencia
          .map((value) =>
            getExistenceFilterLabel(value).toUpperCase()
          )
          .join(", ")
      : "TODAS";

  const informationRows = [
    ["SUCURSAL", selectedBranchLabel],
    ["PRODUCTOS EXPORTADOS", String(filteredRows.length)],
    ["FILTRO NOMBRE", appliedNameFilter],
    ["FILTRO DEPARTAMENTO", appliedDepartmentFilter],
    ["FILTRO EXISTENCIA", appliedInventoryFilter],
    ["EXPORTADO", formatDateTime(new Date().toISOString())],
  ];

  const thinBorder = {
    top: {
      style: "thin",
      color: { argb: "FF000000" },
    },
    left: {
      style: "thin",
      color: { argb: "FF000000" },
    },
    bottom: {
      style: "thin",
      color: { argb: "FF000000" },
    },
    right: {
      style: "thin",
      color: { argb: "FF000000" },
    },
  };

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

    labelCell.border = thinBorder;
    valueCell.border = thinBorder;

    labelCell.alignment = {
      vertical: "middle",
    };

    valueCell.alignment = {
      vertical: "middle",
    };
  });

  const headerRowNumber = 10;
  const dataStartRow = headerRowNumber + 1;

  worksheet.getRow(headerRowNumber).values = [
    "CÓDIGO",
    "NOMBRE",
    "DEPARTAMENTO",
    "EXISTENCIA",
    "MÍNIMO",
    "MÁXIMO",
  ];

  worksheet.getRow(headerRowNumber).eachCell((cell) => {
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

    cell.border = thinBorder;

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
  });

  filteredRows.forEach((row, index) => {
    const excelRow = worksheet.getRow(dataStartRow + index);

    excelRow.values = [
      toUpperSafe(row.codigo),
      toUpperSafe(row.nombre),
      toUpperSafe(row.depto),
      formatInventoryValue(row.existencia),
      formatInventoryValue(row.min),
      formatInventoryValue(row.max),
    ];

    for (
      let columnNumber = 1;
      columnNumber <= 6;
      columnNumber += 1
    ) {
      const cell = excelRow.getCell(columnNumber);

      cell.font = {
        name: "Arial",
      };

      cell.border = thinBorder;

      cell.alignment =
        columnNumber >= 4
          ? {
              horizontal: "center",
              vertical: "middle",
            }
          : {
              vertical: "middle",
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

  worksheet.autoFilter = {
    from: {
      row: headerRowNumber,
      column: 1,
    },
    to: {
      row: headerRowNumber,
      column: 6,
    },
  };

  const branchNameForFile = normalizeFilenameSegment(
    selectedBranchLabel,
    "POLIGONO"
  );

  const filename =
    `INVENTARIO ${branchNameForFile} ` +
    `${formatDateForFilename()}.xlsx`;

  const output = await workbook.xlsx.writeBuffer();

  const blob = new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
};

export default exportInventoryReport;