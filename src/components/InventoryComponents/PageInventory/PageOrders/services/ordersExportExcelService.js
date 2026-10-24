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

const applyHeaderStyle = (row) => {
  row.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF7FBFD" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFD8E3EA" } },
      left: { style: "thin", color: { argb: "FFD8E3EA" } },
      bottom: { style: "thin", color: { argb: "FFD8E3EA" } },
      right: { style: "thin", color: { argb: "FFD8E3EA" } },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });
};

const applyCellBorders = (row) => {
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFEEF3F6" } },
      left: { style: "thin", color: { argb: "FFEEF3F6" } },
      bottom: { style: "thin", color: { argb: "FFEEF3F6" } },
      right: { style: "thin", color: { argb: "FFEEF3F6" } },
    };
  });
};

export const exportStoreOrderToExcel = async (order) => {
  if (!order) return false;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Pedido");

  sheet.columns = [
    { header: "Campo", key: "campo", width: 28 },
    { header: "Valor", key: "valor", width: 70 },
  ];

  applyHeaderStyle(sheet.getRow(1));

  const infoRows = [
    { campo: "Folio", valor: order.orderNumber || "" },
    { campo: "Nombre del pedido", valor: order.orderName || "" },
    { campo: "Sucursal Origen", valor: order.fromBranchName || "" },
    { campo: "Sucursal Destino", valor: order.toBranchName || "" },
    { campo: "Enviado", valor: formatOrderDateTime(order.sentAt) },
    {
      campo: "Recibido",
      valor: order.acceptedAt
        ? formatOrderDateTime(order.acceptedAt)
        : "Pendiente",
    },
    { campo: "Generado por", valor: order.createdByLabel || "" },
    { campo: "Recibido por", valor: order.receivedByLabel || "" },
    {
      campo: "Departamentos",
      valor: (order.departments || []).join(", ") || "Sin departamento",
    },
    { campo: "Productos", valor: order.items?.length || 0 },
  ];

  infoRows.forEach((row) => {
    const added = sheet.addRow(row);
    applyCellBorders(added);
  });

  sheet.addRow({});
  const itemsTitle = sheet.addRow(["Partidas"]);
  itemsTitle.font = { bold: true, size: 12 };

  const itemsHeader = sheet.addRow([
    "Código",
    "Producto",
    "Departamento",
    "Esperado",
    "Recibido",
    "Diferencia",
  ]);
  applyHeaderStyle(itemsHeader);

  (order.items || []).forEach((item) => {
    const added = sheet.addRow([
      item.barcode || "",
      item.productName || "",
      item.departmentName || "Sin departamento",
      item.expectedQty ?? "",
      item.receivedQty ?? "",
      item.differenceQty ?? "",
    ]);
    applyCellBorders(added);
  });

  sheet.getColumn(1).width = 16;
  sheet.getColumn(2).width = 40;
  sheet.getColumn(3).width = 24;
  sheet.getColumn(4).width = 14;
  sheet.getColumn(5).width = 14;
  sheet.getColumn(6).width = 14;

  if (order.notes) {
    sheet.addRow({});
    const noteTitle = sheet.addRow(["Notas del pedido"]);
    noteTitle.font = { bold: true, size: 12 };
    const noteRow = sheet.addRow([order.notes]);
    applyCellBorders(noteRow);
    sheet.getColumn(1).width = Math.max(sheet.getColumn(1).width || 16, 70);
  }

  if (order.discrepancyNotes) {
    sheet.addRow({});
    const discTitle = sheet.addRow(["Diferencias / Discrepancias"]);
    discTitle.font = { bold: true, size: 12 };
    const discRow = sheet.addRow([order.discrepancyNotes]);
    applyCellBorders(discRow);
  }

  const differences = (order.items || []).filter(
    (item) =>
      item?.differenceQty !== undefined &&
      item?.differenceQty !== null &&
      Number(item.differenceQty) !== 0
  );

  if (differences.length > 0) {
    sheet.addRow({});
    const diffTitle = sheet.addRow(["Diferencias por partida"]);
    diffTitle.font = { bold: true, size: 12 };

    const diffHeader = sheet.addRow([
      "Código",
      "Producto",
      "Departamento",
      "Diferencia",
      "Tipo",
    ]);
    applyHeaderStyle(diffHeader);

    differences.forEach((item) => {
      const diff = Number(item.differenceQty);
      const isSurplus = diff > 0;
      const added = sheet.addRow([
        item.barcode || "",
        item.productName || "",
        item.departmentName || "Sin departamento",
        isSurplus ? `+${diff}` : diff,
        isSurplus ? "Sobra" : "Falta",
      ]);
      applyCellBorders(added);
    });
  }

  const fileName = `Pedido_${order.orderNumber || "sin-folio"}.xlsx`;
  await saveExcel(workbook, fileName);
  return true;
};

export default exportStoreOrderToExcel;
