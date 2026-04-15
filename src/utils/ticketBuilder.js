const TICKET_WIDTH = 32;
const TIME_ZONE = "America/Cancun";

const repeat = (char, times) => char.repeat(times);

const separator = (char = "-") => repeat(char, TICKET_WIDTH);
const strongSeparator = (char = "=") => repeat(char, TICKET_WIDTH);

const centerText = (text = "", width = TICKET_WIDTH) => {
  const clean = String(text ?? "");
  if (clean.length >= width) return clean;
  const left = Math.floor((width - clean.length) / 2);
  const right = width - clean.length - left;
  return " ".repeat(left) + clean + " ".repeat(right);
};

const money = (value) => {
  const number = Number(value || 0);
  return `$${number.toFixed(2)}`;
};

const normalizeSpaces = (text = "") =>
  String(text ?? "").replace(/\s+/g, " ").trim();

const formatDate = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("es-MX", {
    timeZone: TIME_ZONE,
  });
};

const formatTime = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("es-MX", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateTime = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return `${formatDate(dateValue)} ${formatTime(dateValue)}`;
};

const wrapText = (text = "", width = TICKET_WIDTH) => {
  const clean = normalizeSpaces(text);
  if (!clean) return [""];

  const words = clean.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;

    if (test.length <= width) {
      current = test;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    if (word.length > width) {
      let remaining = word;
      while (remaining.length > width) {
        lines.push(remaining.slice(0, width));
        remaining = remaining.slice(width);
      }
      current = remaining;
    } else {
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
};

const padRight = (text = "", width = 0) => {
  const clean = String(text ?? "");
  if (clean.length >= width) return clean.slice(0, width);
  return clean + " ".repeat(width - clean.length);
};

const padLeft = (text = "", width = 0) => {
  const clean = String(text ?? "");
  if (clean.length >= width) return clean.slice(0, width);
  return " ".repeat(width - clean.length) + clean;
};

const formatItemLine = (qty = "", description = "", amount = "") => {
  const qtyWidth = 5;
  const gapWidth = 1;
  const amountWidth = 9;
  const descWidth = TICKET_WIDTH - qtyWidth - gapWidth - amountWidth;

  const qtyText = padRight(qty, qtyWidth);
  const descText = padRight(description, descWidth);
  const amountText = padLeft(amount, amountWidth);

  return `${qtyText}${descText}${" ".repeat(gapWidth)}${amountText}`;
};

const formatTotalLine = (label = "", value = "") => {
  const valueText = String(value ?? "");
  const labelWidth = TICKET_WIDTH - valueText.length;
  return padRight(label, labelWidth) + valueText;
};

const getPaymentLabel = (payments = [], fallbackMethod = "") => {
  if (!payments.length) {
    return fallbackMethod ? String(fallbackMethod).toUpperCase() : "SIN PAGOS";
  }

  const names = payments
    .map((p) => p.payment_method_name || p.paymentMethod || p.method)
    .filter(Boolean)
    .map((name) => String(name).toUpperCase());

  const uniqueNames = [...new Set(names)];

  if (!uniqueNames.length) return "SIN PAGOS";
  if (uniqueNames.length === 1) return uniqueNames[0];
  return "MIXTO";
};

const getPaymentAmountInMxn = (payment = {}) => {
  const amount = Number(payment.amount || 0);
  const currency = String(payment.currency || "MXN").toUpperCase();
  const exchangeRate = Number(
    payment.exchange_rate || payment.exchangeRate || 0
  );

  if (currency === "USD") {
    return exchangeRate > 0 ? amount * exchangeRate : 0;
  }

  return amount;
};

const getTotalPaidInMxn = (payments = [], fallbackAmount = 0) => {
  if (!payments.length) return Number(fallbackAmount || 0);

  return payments.reduce((acc, payment) => {
    return acc + getPaymentAmountInMxn(payment);
  }, 0);
};

const shouldShowReceivedAndChange = (payments = [], fallbackMethod = "") => {
  if (!payments.length) {
    const method = String(fallbackMethod || "").toUpperCase();
    return method.includes("EFECTIVO") || method.includes("USD");
  }

  const normalizedMethods = payments
    .map((p) =>
      String(
        p.payment_method_name || p.paymentMethod || p.method || ""
      ).toUpperCase()
    )
    .filter(Boolean);

  const hasCash = normalizedMethods.some((name) => name.includes("EFECTIVO"));
  const hasUsd = payments.some(
    (p) => String(p.currency || "MXN").toUpperCase() === "USD"
  );

  return hasCash || hasUsd || normalizedMethods.length > 1;
};

const pushWrappedLeft = (lines, text = "", width = TICKET_WIDTH) => {
  wrapText(text, width).forEach((line) => {
    lines.push(line);
  });
};

const formatStateShort = (state = "") => {
  const clean = normalizeSpaces(state).toUpperCase();

  const map = {
    "QUINTANA ROO": "QROO",
    "Q. ROO": "QROO",
    "QUERETARO": "QRO",
    "CIUDAD DE MEXICO": "CDMX",
    "ESTADO DE MEXICO": "EDOMEX",
    "NUEVO LEON": "NL",
    "JALISCO": "JAL",
    "YUCATAN": "YUC",
  };

  return map[clean] || clean;
};

const extractPostalCode = (address = "") => {
  const clean = normalizeSpaces(address);
  const match = clean.match(/\b\d{5}\b/);
  return match ? match[0] : "";
};

const removePostalCode = (address = "") => {
  return normalizeSpaces(address).replace(/\b\d{5}\b/g, "").trim();
};

const normalizeAddressLine1 = (address = "") => {
  return removePostalCode(address)
    .toUpperCase()
    .replace(/\s*,\s*/g, " ")
    .replace(/\s*-\s*/g, " ")
    .replace(/\bNO\b\.?/g, "NO.")
    .replace(/\bMZA\b\.?/g, "MZ")
    .replace(/\bMANZANA\b/g, "MZ")
    .replace(/\bLOTE\b/g, "LT")
    .replace(/\bLT\b\.?/g, "LT")
    .replace(/\bMZ\b\.?/g, "MZ")
    .replace(/\s+/g, " ")
    .trim();
};

const formatBranchAddressLines = (branch = {}) => {
  const rawAddress = branch.address || "";
  const city = normalizeSpaces(branch.city || "").toUpperCase();
  const state = formatStateShort(branch.state || "");
  const postalCode =
    extractPostalCode(rawAddress) ||
    extractPostalCode(branch.postal_code || "") ||
    extractPostalCode(branch.zip_code || "");

  const addressLine1 = normalizeAddressLine1(rawAddress);
  const addressLine2 = [city ? `${city},` : "", state, postalCode ? `CP ${postalCode}` : ""]
    .filter(Boolean)
    .join(" ")
    .trim();

  const result = [];

  if (addressLine1) {
    const wrappedAddress = wrapText(addressLine1, TICKET_WIDTH);
    wrappedAddress.forEach((line) => result.push(line));
  }

  if (addressLine2) {
    const wrappedLine2 = wrapText(addressLine2, TICKET_WIDTH);
    wrappedLine2.forEach((line) => result.push(line));
  }

  return result;
};

export const buildTicketText = ({
  branch = {},
  sale = {},
  items = [],
  cashierName = "",
  footer = {},
  isReprint = false,
  reprintedAt = null,
}) => {
  const lines = [];

  const branchName = branch.name || "SUCURSAL";
  const branchPhone = branch.phone || "";

  const saleDate = sale.created_at || sale.date || new Date();
  const cancelledAt = sale.cancelled_at || null;
  const isCancelled =
    sale.status === "cancelled" || sale.status === "cancelada";

  const payments = sale.payments || [];
  const partialReturns = sale.returns || [];
  const paymentLabel = getPaymentLabel(payments, sale.payment_method);
  const totalPaidInMxn = getTotalPaidInMxn(
    payments,
    sale.amount_received ?? sale.paid_amount
  );
  const showReceivedAndChange = shouldShowReceivedAndChange(
    payments,
    sale.payment_method
  );

  lines.push(strongSeparator());
  lines.push(centerText("CROKETS"));
  lines.push(centerText(branchName.toUpperCase()));

  const branchAddressLines = formatBranchAddressLines(branch);
  branchAddressLines.forEach((line) => {
    lines.push(centerText(line));
  });

  if (branchPhone) {
    lines.push(centerText(`Tel. ${branchPhone}`));
  }

  lines.push(strongSeparator());
  lines.push(`Fecha: ${formatDate(saleDate)}`);
  lines.push(`Hora : ${formatTime(saleDate)}`);
  lines.push(
    `Cajero: ${(cashierName || sale.cashier_name || "").toUpperCase()}`
  );
  lines.push(`Folio : ${sale.folio || "-"}`);
  lines.push(separator());

  lines.push(formatItemLine("Cant", "Descripción", "Importe"));
  lines.push(separator());

  items.forEach((item) => {
    const quantity = String(item.quantity ?? item.qty ?? 0);
    const description =
      item.description || item.product_name || item.name || "PRODUCTO";
    const finalUnitPrice = Number(item.unit_price ?? item.price ?? 0);
    const originalUnitPrice = Number(
      item.original_unit_price ?? item.originalUnitPrice ?? finalUnitPrice
    );
    const discountAmount = Number(item.discount_amount ?? item.discountAmount ?? 0);
    const lineTotal = Number(
      item.total ?? item.line_total ?? item.total_price ?? 0
    );

    const descWidthForWrap = TICKET_WIDTH - 5 - 1 - 9;
    const descLines = wrapText(description.toUpperCase(), descWidthForWrap);

    lines.push(
      formatItemLine(quantity, descLines[0] || "", lineTotal.toFixed(2))
    );

    for (let i = 1; i < descLines.length; i++) {
      lines.push(formatItemLine("", descLines[i], ""));
    }

    lines.push(formatItemLine("", `P.U. ${money(originalUnitPrice)}`, ""));

    if (discountAmount > 0 && originalUnitPrice > finalUnitPrice) {
      lines.push(
        formatItemLine(
          "",
          `Desc. ${money(originalUnitPrice - finalUnitPrice)} c/u`,
          ""
        )
      );
    }

    lines.push("");
  });

  const itemCount = items.reduce(
    (acc, item) => acc + Number(item.quantity ?? item.qty ?? 0),
    0
  );

  lines.push(separator());
  lines.push(`Artículos: ${itemCount}`);
  lines.push(formatTotalLine("Subtotal:", money(sale.subtotal)));

  if (Number(sale.discount_total || 0) > 0) {
    lines.push(
      formatTotalLine("Descuento:", `-${money(sale.discount_total)}`)
    );
  }

  lines.push(formatTotalLine("IVA 16%:", money(sale.tax ?? sale.iva)));
  lines.push(formatTotalLine("TOTAL:", money(sale.total)));
  lines.push(separator());

  lines.push(`Método de pago: ${paymentLabel}`);

  if (payments.length > 0) {
    payments.forEach((payment) => {
      const methodName = (
        payment.payment_method_name ||
        payment.paymentMethod ||
        payment.method ||
        "PAGO"
      ).toUpperCase();

      const amount = Number(payment.amount || 0);
      const currency = String(payment.currency || "MXN").toUpperCase();
      const exchangeRate = Number(
        payment.exchange_rate || payment.exchangeRate || 0
      );
      const reference = String(payment.reference || "").trim();

      if (currency === "USD") {
        lines.push(
          formatTotalLine(`${methodName} USD:`, `$${amount.toFixed(2)}`)
        );

        if (exchangeRate > 0) {
          lines.push(
            formatTotalLine("T.C. USD:", `$${exchangeRate.toFixed(2)}`)
          );
          lines.push(
            formatTotalLine("EQ. MXN USD:", money(amount * exchangeRate))
          );
        }
      } else {
        lines.push(formatTotalLine(`${methodName}:`, money(amount)));
      }

      if (reference) {
        lines.push("Referencia:");
        wrapText(reference, TICKET_WIDTH).forEach((line) => lines.push(line));
      }
    });
  }

  if (showReceivedAndChange) {
    lines.push(formatTotalLine("Pago con:", money(totalPaidInMxn)));
    lines.push(
      formatTotalLine("Cambio:", money(sale.change_amount ?? sale.change))
    );
  }

  lines.push(separator());

  if (isCancelled) {
    lines.push(centerText("*** VENTA CANCELADA ***"));

    if (cancelledAt) {
      lines.push(`Fecha cancelación: ${formatDate(cancelledAt)}`);
      lines.push(`Hora cancelación : ${formatTime(cancelledAt)}`);
    }

    lines.push("Motivo:");
    const reasonLines = wrapText(
      sale.cancellation_reason || "SIN MOTIVO REGISTRADO",
      TICKET_WIDTH
    );
    reasonLines.forEach((line) => lines.push(line));

    lines.push(
      `Método reembolso: ${(
        sale.refund_method ||
        sale.cancellation_payment_method ||
        "N/A"
      ).toUpperCase()}`
    );

    lines.push(separator());
  }

  if (partialReturns.length > 0) {
    lines.push(centerText("*** DEVOLUCIONES PARCIALES ***"));
    lines.push(formatTotalLine("Devuelto acum.:", money(sale.total_returned || 0)));
    lines.push(formatTotalLine("Neto actual:", money(sale.net_total ?? sale.total)));
    lines.push(separator());

    partialReturns.forEach((ret, index) => {
      lines.push(`Devolución #${index + 1}`);

      if (ret.created_at) {
        lines.push(`Fecha: ${formatDate(ret.created_at)}`);
        lines.push(`Hora : ${formatTime(ret.created_at)}`);
      }

      lines.push(
        `Método: ${String(ret.refund_method || "N/A").toUpperCase()}`
      );

      lines.push(
        formatTotalLine("Monto devuelto:", money(ret.total_refund || 0))
      );

      lines.push("Motivo:");
      wrapText(ret.return_reason || "SIN MOTIVO REGISTRADO", TICKET_WIDTH)
        .forEach((line) => lines.push(line));

      if ((ret.items || []).length > 0) {
        lines.push(separator());
        lines.push(formatItemLine("Cant", "Devuelto", "Importe"));
        lines.push(separator());

        ret.items.forEach((item) => {
          const quantity = String(item.quantity || 0);
          const description = String(
            item.description || item.product_name || "PRODUCTO"
          ).toUpperCase();
          const totalPrice = Number(item.total_price || 0);

          const descWidthForWrap = TICKET_WIDTH - 5 - 1 - 9;
          const descLines = wrapText(description, descWidthForWrap);

          lines.push(
            formatItemLine(quantity, descLines[0] || "", totalPrice.toFixed(2))
          );

          for (let i = 1; i < descLines.length; i++) {
            lines.push(formatItemLine("", descLines[i], ""));
          }
        });
      }

      lines.push(separator());
    });
  }

  if (isReprint) {
    lines.push(centerText("*** COPIA DE TICKET ***"));
    lines.push(`Reimpreso: ${formatDateTime(reprintedAt || new Date())}`);
    lines.push(separator());
  }

  const saleNotes = String(sale.notes || "").trim();

  if (saleNotes) {
    lines.push("Notas:");
    wrapText(saleNotes, TICKET_WIDTH).forEach((line) => lines.push(line));
    lines.push(separator());
  }

  const footerLine1 = footer.line1 || "Gracias por su compra";
  const footerLine2 = footer.line2 || "Agenda tu cita de baño";
  const footerPhone = footer.phone || "";
  const returnPolicy =
    footer.returnPolicy ||
    "Para cambios o devoluciones presentar ticket de compra";

  lines.push(footerLine1);
  lines.push("");

  if (footerLine2) {
    lines.push(footerLine2);
  }

  if (footerPhone) {
    lines.push(`Tel. ${footerPhone}`);
  }

  if (returnPolicy) {
    lines.push("");
    pushWrappedLeft(lines, returnPolicy, TICKET_WIDTH);
  }

  lines.push(strongSeparator());

  return lines.join("\n");
};