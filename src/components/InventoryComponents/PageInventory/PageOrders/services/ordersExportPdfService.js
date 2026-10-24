import {
  formatCurrency,
  formatOrderDateTime,
  formatQuantity,
  getOrderNumber,
  getOrderStatusMeta,
} from "../utils/ordersFormatters";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const buildRows = (items = []) =>
  items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.barcode || "—")}</td>
          <td>${escapeHtml(item.productName)}</td>
          <td>${escapeHtml(item.departmentName || "Sin departamento")}</td>
          <td class="numeric">${escapeHtml(formatQuantity(item.expectedQty))}</td>
          <td class="numeric">${escapeHtml(formatQuantity(item.receivedQty))}</td>
          <td class="numeric">${escapeHtml(formatQuantity(item.differenceQty))}</td>
        </tr>
      `
    )
    .join("");

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 28px;
    color: #25313c;
    font-family: "Segoe UI", Arial, sans-serif;
    font-size: 12px;
  }
  header {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    border-bottom: 2px solid #1092b1;
    padding-bottom: 12px;
  }
  h1 { margin: 0 0 4px; font-size: 20px; color: #0f7a94; }
  h2 { margin: 0; font-size: 14px; color: #ff8a00; }
  .meta { text-align: right; }
  .meta p { margin: 2px 0; }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 24px;
    margin: 16px 0;
  }
  .field strong { display: block; color: #6d7b86; font-size: 10px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; }
  th, td { border: 1px solid #dbe4ea; padding: 6px 8px; text-align: left; }
  th { background: #f2f7f9; color: #0f7a94; font-size: 10px; text-transform: uppercase; }
  .numeric { text-align: right; }
  .notes { margin-top: 14px; padding: 10px; border: 1px solid #ffd8a8; background: #fff8ec; }
  .notes p { margin: 4px 0; }
  footer { margin-top: 28px; display: flex; gap: 48px; }
  .signature { flex: 1; border-top: 1px solid #25313c; padding-top: 6px; text-align: center; }
  @page { size: letter; margin: 12mm; }
  @media print { body { padding: 0; } }
`;

export const buildOrderPrintHtml = (order) => {
  const status = getOrderStatusMeta(order?.status);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(getOrderNumber(order) || "Pedido")}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <header>
    <div>
      <h1>Pedido de abastecimiento</h1>
      <h2>${escapeHtml(getOrderNumber(order))} - ${escapeHtml(order?.orderName)}</h2>
    </div>
    <div class="meta">
      <p><strong>Estado:</strong> ${escapeHtml(status.label)}</p>
      <p><strong>Enviado:</strong> ${escapeHtml(formatOrderDateTime(order?.sentAt))}</p>
    </div>
  </header>

  <section class="grid">
    <div class="field"><strong>Sucursal origen</strong>${escapeHtml(order?.fromBranchName)}</div>
    <div class="field"><strong>Sucursal destino</strong>${escapeHtml(order?.toBranchName)}</div>
    <div class="field"><strong>Generado por</strong>${escapeHtml(order?.createdByLabel || "—")}</div>
    <div class="field"><strong>Recibido por</strong>${escapeHtml(order?.receivedByLabel || "—")}</div>
    <div class="field"><strong>Departamentos</strong>${escapeHtml(
      (order?.departments || []).join(", ") || "Sin departamento"
    )}</div>
    <div class="field"><strong>Recibido el</strong>${escapeHtml(
      order?.acceptedAt ? formatOrderDateTime(order.acceptedAt) : "Pendiente"
    )}</div>
  </section>

  <table>
    <thead>
      <tr>
        <th>Codigo</th>
        <th>Producto</th>
        <th>Departamento</th>
        <th class="numeric">Esperado</th>
        <th class="numeric">Recibido</th>
        <th class="numeric">Diferencia</th>
      </tr>
    </thead>
    <tbody>${buildRows(order?.items)}</tbody>
  </table>

  ${
    order?.notes
      ? `<section class="notes"><strong>Notas del pedido</strong><p>${escapeHtml(order.notes)}</p></section>`
      : ""
  }

  ${
    order?.discrepancyNotes
      ? `<section class="notes"><strong>Diferencias de recepcion</strong><p>${escapeHtml(order.discrepancyNotes)}</p></section>`
      : ""
  }

  <footer>
    <div class="signature">Entrega</div>
    <div class="signature">Recibe</div>
  </footer>
</body>
</html>`;
};

export const printStoreOrder = (order, preOpenedWindow = null) => {
  if (typeof window === "undefined" || !order) return false;

  const printWindow =
    preOpenedWindow && !preOpenedWindow.closed
      ? preOpenedWindow
      : window.open("", "_blank", "noopener,noreferrer,width=900,height=700");

  if (!printWindow) return false;

  try {
    printWindow.document.write(buildOrderPrintHtml(order));
    printWindow.document.close();
    printWindow.focus();

    window.setTimeout(() => {
      try {
        printWindow.print();
      } catch (err) {
        console.error("Error al imprimir pedido:", err);
      }
    }, 250);
  } catch (err) {
    console.error("Error al abrir vista de impresión del pedido:", err);
    return false;
  }

  return true;
};

export const getOrderPrintTotal = (order) =>
  formatCurrency(
    (order?.items || []).reduce(
      (total, item) =>
        total + Number(item.costPrice || 0) * Number(item.expectedQty || 0),
      0
    )
  );
