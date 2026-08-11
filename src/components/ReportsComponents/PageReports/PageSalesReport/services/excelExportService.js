// helper privado para sanitizar
const escapeHtml = (unsafe) => {
  return (unsafe || "").toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// helper privado para nombrar el archivo
const getExportFileName = (prefix, startDate, endDate, selectedBranch, branchesList) => {
  const dStr = (d) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : "";
  let bName = "Global";
  if (selectedBranch !== "Todas") {
    const fb = branchesList.find((b) => b.id === selectedBranch);
    bName = fb ? fb.name.trim() : "Sucursal";
  }
  const bLabel = bName.replace(/\s+/g, "_");
  const startStr = dStr(startDate);
  const endStr = dStr(endDate);
  const dateLabel = startStr && endStr ? (startStr === endStr ? startStr : `del_${startStr}_al_${endStr}`) : dStr(new Date());
  return `${prefix}_${bLabel}_${dateLabel}.xls`;
};

// helper privado para forzar la descarga en el navegador
const triggerDownload = (htmlTemplate, fileName) => {
  const blob = new Blob(["\uFEFF" + htmlTemplate], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateSummaryExcel = (exportData, summary, filters, branchesList, startDate, endDate) => {
  const fileName = getExportFileName("Resumen_Ventas", startDate, endDate, filters.branch, branchesList);
  const emissionDate = new Date().toLocaleString("es-MX", { timeZone: filters.timeZone });

  const htmlTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; font-size: 10pt; color: #1f2d3d; }
        .title { font-size: 16pt; font-weight: bold; color: #1092b1; margin-bottom: 4px; }
        .subtitle { font-size: 10pt; color: #64748b; margin-bottom: 16px; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th { background-color: #1092b1; color: #ffffff; font-size: 10pt; font-weight: bold; padding: 10px 14px; border: 1px solid #0e7c97; text-align: left; }
        td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 9.5pt; vertical-align: middle; }
        .text-center { text-align: center; }
        .currency { mso-number-format: "\\$#,##0.00"; text-align: right; font-weight: bold; }
        .discount { color: #d97706; mso-number-format: "-\\$#,##0.00"; text-align: right; font-weight: bold; }
        .status-completed { background-color: #ecfdf5; color: #059669; font-weight: bold; text-align: center; }
        .status-cancelled { background-color: #fef2f2; color: #dc2626; font-weight: bold; text-align: center; }
        .status-warning { background-color: #fffbeb; color: #d97706; font-weight: bold; text-align: center; }
        .tfoot-label { text-align: right; font-weight: bold; background-color: #f8fafc; }
        .tfoot-value { background-color: #f8fafc; font-size: 11pt; }
      </style>
    </head>
    <body>
      <div class="title">RESUMEN DE VENTAS - CROKETS POS</div>
      <div class="subtitle"><b>Fecha de emisión:</b> ${emissionDate}</div>
      <table>
        <thead>
          <tr><th>Folio</th><th>Fecha</th><th>Sucursal</th><th>Cajero</th><th>Cliente</th><th>Método de Pago</th><th>Estado</th><th style="text-align: right;">Descuento</th><th style="text-align: right;">Total</th></tr>
        </thead>
        <tbody>
          ${exportData.map((sale) => `
            <tr><td><b>#${sale.ticketNumber}</b></td><td>${sale.date}</td><td>${escapeHtml(sale.branch)}</td><td>${escapeHtml(sale.cashier)}</td><td>${escapeHtml(sale.client)}</td><td class="text-center">${escapeHtml(sale.method)}</td><td class="${sale.status === "Completada" ? "status-completed" : sale.status === "Cancelada" ? "status-cancelled" : "status-warning"}">${sale.status}</td><td class="discount">${sale.discount}</td><td class="currency">${sale.total}</td></tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr><td colspan="7" class="tfoot-label">TOTAL ACUMULADO (FILTRO ACTIVO):</td><td class="discount tfoot-value">${summary.totalDiscounts}</td><td class="currency tfoot-value">${summary.totalIncome}</td></tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;
  triggerDownload(htmlTemplate, fileName);
};

export const generateDetailedExcel = (detailedData, filters, branchesList, startDate, endDate) => {
  const fileName = getExportFileName("Reporte_Detallado", startDate, endDate, filters.branch, branchesList);
  const emissionDate = new Date().toLocaleString("es-MX", { timeZone: filters.timeZone });

  const htmlTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; font-size: 10pt; color: #1f2d3d; }
        .title { font-size: 16pt; font-weight: bold; color: #1092b1; margin-bottom: 4px; }
        .subtitle { font-size: 10pt; color: #64748b; margin-bottom: 16px; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th { background-color: #1092b1; color: #ffffff; font-size: 10pt; font-weight: bold; padding: 10px 14px; border: 1px solid #0e7c97; text-align: left; }
        td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 9.5pt; vertical-align: middle; }
        .text-center { text-align: center; }
        .currency { mso-number-format: "\\$#,##0.00"; text-align: right; }
        .discount { color: #d97706; mso-number-format: "-\\$#,##0.00"; text-align: right; }
        .text-code { mso-number-format: "\\@"; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="title">REPORTE DETALLADO DE PRODUCTOS - CROKETS POS</div>
      <div class="subtitle"><b>Fecha de emisión:</b> ${emissionDate}</div>
      <table>
        <thead>
          <tr><th>Folio</th><th>Fecha</th><th>Sucursal</th><th>Cajero</th><th>Cliente</th><th>Estado</th><th>Código Producto</th><th>Descripción</th><th style="text-align: center;">Cantidad</th><th style="text-align: right;">Precio Unitario</th><th>Motivo Descuento</th><th style="text-align: right;">Descuento</th><th style="text-align: right;">Total Línea</th></tr>
        </thead>
        <tbody>
          ${detailedData.map((row) => `
            <tr><td><b>#${row.ticketNumber}</b></td><td>${row.date}</td><td>${escapeHtml(row.branch)}</td><td>${escapeHtml(row.cashier)}</td><td>${escapeHtml(row.client)}</td><td>${row.status}</td><td class="text-code">${escapeHtml(row.barcode)}</td><td>${escapeHtml(row.productName)}</td><td class="text-center">${row.quantity}</td><td class="currency">${row.unitPrice}</td><td>${escapeHtml(row.discountType)}</td><td class="discount">${row.discountAmount}</td><td class="currency"><b>${row.totalPrice}</b></td></tr>
          `).join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;
  triggerDownload(htmlTemplate, fileName);
};