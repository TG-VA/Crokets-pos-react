import ExcelJS from "exceljs";

import { formatOrderDateTime } from "../utils/ordersFormatters";

const saveExcel = async (workbook, fileName) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const exportStoreOrderToExcel = async (order) => {
  if (!order) return false;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Pedido");

  sheet.columns = [
    { header: "Campo", key: "campo", width: 30 },
    { header: "Valor", key: "valor", width: 60 },
  ];

  sheet.addRows([
    { campo: "Folio", valor: order.orderNumber || "" },
    { campo: "Nombre del pedido", valor: order.orderName || "" },
    { campo: "Sucursal origen", valor: order.fromBranchName || "" },
    { campo: "Sucursal destino", valor: order.toBranchName || "" },
    { campo: "Enviado", valor: formatOrderDateTime(order.sentAt) },
    {
      campo: "Recibido",
      valor: order.acceptedAt
        ? formatOrderDateTime(order.acceptedAt)
        : "Pendiente",
    },
    { campo: "Generado por", valor: order.createdByLabel || "" },
    { campo: "Recibido por", valor: order.receivedByLabel || "" },
    { campo: "Departamentos", valor: (order.departments || []).join(", ") },
    { campo: "Productos", valor: order.items?.length || 0 },
  ]);

  sheet.addRow({});
  const itemsHeader = sheet.addRow([
    "Codigo",
    "Producto",
    "Departamento",
    "Esperado",
    "Recibido",
    "Diferencia",
  ]);
  itemsHeader.font = { bold: true };

  (order.items || []).forEach((item) => {
    sheet.addRow([
      item.barcode || "",
      item.productName || "",
      item.departmentName || "",
      item.expectedQty ?? "",
      item.receivedQty ?? "",
      item.differenceQty ?? "",
    ]);
  });

  if (order.notes) {
    sheet.addRow({});
    const noteHeader = sheet.addRow(["Notas del pedido"]);
    noteHeader.font = { bold: true };
    sheet.addRow([order.notes]);
  }

  if (order.discrepancyNotes) {
    sheet.addRow({});
    const discHeader = sheet.addRow(["Diferencias de recepcion"]);
    discHeader.font = { bold: true };
    sheet.addRow([order.discrepancyNotes]);
  }

  const differences = (order.items || []).filter(
    (item) =>
      item?.differenceQty !== undefined &&
      item?.differenceQty !== null &&
      Number(item.differenceQty) !== 0
  );

  if (differences.length > 0) {
    sheet.addRow({});
    const diffHeader = sheet.addRow([
      "Codigo",
      "Producto",
      "Departamento",
      "Diferencia",
      "Tipo",
    ]);
    diffHeader.font = { bold: true };

    differences.forEach((item) => {
      const diff = Number(item.differenceQty);
      const isSurplus = diff > 0;
      sheet.addRow([
        item.barcode || "",
        item.productName || "",
        item.departmentName || "",
        isSurplus ? `+${diff}` : diff,
        isSurplus ? "Sobra" : "Falta",
      ]);
    });
  }

  const fileName = `Pedido-${order.orderNumber || "sin-folio"}.xlsx`;
  await saveExcel(workbook, fileName);
  return true;
};

export default exportStoreOrderToExcel;
