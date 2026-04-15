const WIDTH = 32;

const centerText = (text = "") => {
  const clean = String(text ?? "");
  const spaces = Math.max(0, Math.floor((WIDTH - clean.length) / 2));
  return " ".repeat(spaces) + clean;
};

const line = () => "=".repeat(WIDTH);
const dash = () => "-".repeat(WIDTH);

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

const formatDate = (date) =>
  new Date(date).toLocaleDateString("es-MX");

const formatTime = (date) =>
  new Date(date).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

const getShortFolio = (saleId) =>
  saleId ? String(saleId).slice(0, 6).toLowerCase() : "------";

const formatTotalLine = (label = "", value = "") => {
  const safeLabel = String(label ?? "");
  const safeValue = String(value ?? "");
  const spaces = Math.max(1, WIDTH - safeLabel.length - safeValue.length);
  return `${safeLabel}${" ".repeat(spaces)}${safeValue}`;
};

const getMethodShort = (methodName = "") => {
  const name = String(methodName || "").trim().toUpperCase();

  if (!name) return "N/A";
  if (name.includes("EFECTIVO")) return "EFE";
  if (name.includes("TERMINAL") || name.includes("TARJETA")) return "TER";
  if (name.includes("TRANSFER")) return "TRA";
  if (
    name.includes("DÓLAR") ||
    name.includes("DOLAR") ||
    name.includes("USD")
  ) {
    return "USD";
  }
  if (name.includes("MIXTO")) return "MIX";

  return "OTR";
};

export const buildCashCutText = (data = {}) => {
  const {
    branchName,
    username,
    sessionId,
    openedAt,

    ventasTotales,
    dineroCaja,
    ventasTerminal,
    ventasTransferencia,

    openingAmount,
    totalEntradas,
    ventasEfectivo,
    ventasDolaresUsd,
    ventasDolaresMxn,
    totalSalidas,
    devolucionesCaja,
    devolucionesParcialesCaja,

    ventasPorMetodo = [],

    entradas = [],
    salidas = [],

    subtotal,
    discount,
    tax,

    cancelaciones = [],
    devolucionesParciales = [],
  } = data;

  const totalMetodos = ventasPorMetodo.reduce(
    (acc, item) => acc + Number(item.total || 0),
    0
  );

  const totalCancelaciones = cancelaciones.reduce(
    (acc, item) => acc + Number(item.refund_amount || 0),
    0
  );

  const totalDevolucionesParciales = devolucionesParciales.reduce(
    (acc, item) => acc + Number(item.total_refund || 0),
    0
  );

  let t = "";

  // ───── HEADER ─────
  t += `${line()}\n`;
  t += `${centerText("CROKETS")}\n`;
  t += `${centerText("CORTE DE CAJA")}\n`;
  t += `${line()}\n`;

  t += `Sucursal: ${branchName || "SUCURSAL"}\n`;
  t += `Cajero: ${username || "USUARIO"}\n`;
  t += `Turno: ${sessionId || "—"}\n`;
  t += `Apertura: ${formatTime(openedAt || new Date())}\n`;
  t += `Fecha: ${formatDate(new Date())}\n`;

  t += `${dash()}\n`;

  // ───── RESUMEN ─────
  t += `RESUMEN\n`;
  t += `${formatTotalLine("Ventas:", formatMoney(ventasTotales))}\n`;
  t += `${formatTotalLine("Caja:", formatMoney(dineroCaja))}\n`;
  t += `${formatTotalLine("Terminal:", formatMoney(ventasTerminal))}\n`;
  t += `${formatTotalLine("Transferencia:", formatMoney(ventasTransferencia))}\n`;

  t += `${dash()}\n`;

  // ───── DINERO EN CAJA ─────
  t += `DINERO EN CAJA\n`;
  t += `${formatTotalLine("Fondo:", formatMoney(openingAmount))}\n`;
  t += `${formatTotalLine("Entradas:", `+${formatMoney(totalEntradas)}`)}\n`;
  t += `${formatTotalLine("Efectivo:", `+${formatMoney(ventasEfectivo)}`)}\n`;
  t += `${formatTotalLine("USD:", `+${formatMoney(ventasDolaresUsd)}`)}\n`;
  t += `${formatTotalLine("USD->MXN:", `+${formatMoney(ventasDolaresMxn)}`)}\n`;
  t += `${formatTotalLine("Salidas:", `-${formatMoney(totalSalidas)}`)}\n`;
  t += `${formatTotalLine("Cancelaciones:", `-${formatMoney(devolucionesCaja)}`)}\n`;
  t += `${formatTotalLine("Dev parciales:", `-${formatMoney(devolucionesParcialesCaja)}`)}\n`;
  t += `${formatTotalLine("TOTAL:", formatMoney(dineroCaja))}\n`;

  t += `${dash()}\n`;

  // ───── MÉTODOS ─────
  t += `METODOS DE PAGO\n`;

  if (ventasPorMetodo.length === 0) {
    t += `Sin registros\n`;
  } else {
    ventasPorMetodo.forEach((m) => {
      t += `${formatTotalLine(`${m.name}:`, formatMoney(m.total))}\n`;
    });
    t += `${formatTotalLine("TOTAL:", formatMoney(totalMetodos))}\n`;
  }

  t += `${dash()}\n`;

  // ───── ENTRADAS ─────
  t += `ENTRADAS\n`;

  if (entradas.length === 0) {
    t += `Sin registros\n`;
  } else {
    entradas.forEach((e) => {
      t += `${formatTotalLine(formatTime(e.created_at), formatMoney(e.amount))}\n`;
    });
    t += `${formatTotalLine("TOTAL ENTRADAS:", formatMoney(totalEntradas))}\n`;
  }

  t += `${dash()}\n`;

  // ───── SALIDAS ─────
  t += `SALIDAS\n`;

  if (salidas.length === 0) {
    t += `Sin registros\n`;
  } else {
    salidas.forEach((s) => {
      t += `${formatTotalLine(formatTime(s.created_at), formatMoney(s.amount))}\n`;
    });
    t += `${formatTotalLine("TOTAL SALIDAS:", formatMoney(totalSalidas))}\n`;
  }

  t += `${dash()}\n`;

  // ───── RESUMEN VENTAS ─────
  t += `RESUMEN VENTAS\n`;
  t += `${formatTotalLine("Subtotal:", formatMoney(subtotal))}\n`;
  t += `${formatTotalLine("Descuento:", `-${formatMoney(discount)}`)}\n`;
  t += `${formatTotalLine("IVA:", formatMoney(tax))}\n`;
  t += `${formatTotalLine("TOTAL:", formatMoney(ventasTotales))}\n`;

  t += `${dash()}\n`;

  // ───── CANCELACIONES ─────
  t += `CANCELACIONES\n`;

  if (cancelaciones.length === 0) {
    t += `Sin registros\n`;
  } else {
    cancelaciones.forEach((c) => {
      const folio = getShortFolio(c.sale_id);
      const method = getMethodShort(c.refund_method_name);
      const left = `${folio} ${method}`;
      t += `${formatTotalLine(left, formatMoney(c.refund_amount))}\n`;
    });
    t += `${formatTotalLine("TOTAL CANCELADO:", formatMoney(totalCancelaciones))}\n`;
  }

  t += `${dash()}\n`;

  // ───── DEV PARCIALES ─────
  t += `DEV PARCIALES\n`;

  if (devolucionesParciales.length === 0) {
    t += `Sin registros\n`;
  } else {
    devolucionesParciales.forEach((d) => {
      const folio = getShortFolio(d.sale_id);
      const method = getMethodShort(d.refund_method_name);
      const left = `${folio} ${method}`;
      t += `${formatTotalLine(left, formatMoney(d.total_refund))}\n`;
    });
    t += `${formatTotalLine("TOTAL DEV PARC:", formatMoney(totalDevolucionesParciales))}\n`;
  }

  t += `${line()}\n`;

  return t;
};