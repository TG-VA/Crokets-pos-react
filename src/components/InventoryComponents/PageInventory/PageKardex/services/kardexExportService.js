import ExcelJS from "exceljs";

import {
  normalizeKardexFilenameSegment,
} from "../utils/kardexFormatters";

import {
  buildKardexWorksheet,
} from "./kardexWorkbookBuilder";

import {
  downloadKardexWorkbook,
} from "./kardexDownloadService";

const WORKSHEET_NAME =
  "KARDEX";

const getProductName = (
  product
) => {
  return (
    product?.descripcion ??
    product?.name ??
    "SIN NOMBRE"
  );
};

const buildKardexFilename = ({
  product,
  dateFrom,
  dateTo,
}) => {
  const productName =
    normalizeKardexFilenameSegment(
      getProductName(
        product
      ),
      "SIN-NOMBRE"
    );

  const fromSegment =
    normalizeKardexFilenameSegment(
      dateFrom,
      "INICIO"
    );

  const toSegment =
    normalizeKardexFilenameSegment(
      dateTo,
      "HOY"
    );

  const rangeSegment =
    dateFrom || dateTo
      ? `${fromSegment}-A-${toSegment}`
      : "TODAS-LAS-FECHAS";

  return (
    `KARDEX-${productName}-${rangeSegment}.xlsx`
  );
};

export const exportKardexReport =
  async ({
    product,
    rows = [],
    dateFrom = "",
    dateTo = "",
  }) => {
    if (!product) {
      throw new Error(
        "No hay un producto seleccionado para exportar."
      );
    }

    const normalizedRows =
      Array.isArray(rows)
        ? rows
        : [];

    const workbook =
      new ExcelJS.Workbook();

    workbook.creator =
      "Crokets POS";

    workbook.created =
      new Date();

    const worksheet =
      workbook.addWorksheet(
        WORKSHEET_NAME
      );

    buildKardexWorksheet({
      worksheet,
      product,
      rows:
        normalizedRows,
      dateFrom,
      dateTo,
    });

    const filename =
      buildKardexFilename({
        product,
        dateFrom,
        dateTo,
      });

    await downloadKardexWorkbook({
      workbook,
      filename,
    });

    return {
      filename,
      exportedRows:
        normalizedRows.length,
    };
  };