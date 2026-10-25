import ExcelJS from "exceljs";

import { buildOrderExportModel } from "./ordersExportExcelModel";
import {
  buildOrderItemsWorksheet,
  buildOrderSummaryWorksheet,
} from "./ordersWorkbookBuilder";

const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const saveExcel = async (workbook, fileName) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: EXCEL_MIME_TYPE,
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    document.body.removeChild(link);
    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  }
};

export const exportStoreOrderToExcel = async (order) => {
  if (!order) return false;

  const model = buildOrderExportModel(order);
  if (!model) return false;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Crokets POS";
  workbook.created = new Date();
  workbook.title = `Pedido ${order.orderNumber || ""}`.trim();
  workbook.company = "Crokets POS";

  const summarySheet = workbook.addWorksheet("Resumen");
  buildOrderSummaryWorksheet({ worksheet: summarySheet, model });

  const itemsSheet = workbook.addWorksheet("Productos");
  buildOrderItemsWorksheet({ worksheet: itemsSheet, model });

  await saveExcel(workbook, model.fileName);
  return true;
};

export default exportStoreOrderToExcel;
