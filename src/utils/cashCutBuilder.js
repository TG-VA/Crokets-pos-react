const WIDTH = 32;
const TIME_ZONE = "America/Cancun";

const repeat = (char, times) => String(char).repeat(times);

const line = () => repeat("=", WIDTH);
const dash = () => repeat("-", WIDTH);

const normalizeSpaces = (text = "") =>
  String(text ?? "").replace(/\s+/g, " ").trim();

const centerText = (text = "") => {
  const clean = String(text ?? "");
  if (clean.length >= WIDTH) return clean.slice(0, WIDTH);

  const left = Math.floor((WIDTH - clean.length) / 2);
  const right = WIDTH - clean.length - left;

  return `${" ".repeat(left)}${clean}${" ".repeat(right)}`;
};

const padRight = (text = "", width = 0) => {
  const clean = String(text ?? "");
  if (clean.length >= width) return clean.slice(0, width);
  return clean + " ".repeat(width - clean.length);
};

const formatMoney = (value) => {
  const number = Number(value || 0);
  const sign = number < 0 ? "-" : "";
  return `${sign}$${Math.abs(number).toFixed(2)}`;
};

const formatPositiveMoney = (value) =>
  `+${formatMoney(Math.abs(Number(value || 0)))}`;

const formatNegativeMoney = (value) =>
  `-${formatMoney(Math.abs(Number(value || 0)))}`;

const formatSignedMoney = (value) => {
  const number = Number(value || 0);
  if (number > 0) return formatPositiveMoney(number);
  if (number < 0) return formatNegativeMoney(number);
  return formatMoney(0);
};

const formatDate = (dateValue) => {
  if (!dateValue) return "--/--/----";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "--/--/----";

  return date.toLocaleDateString("es-MX", {
    timeZone: TIME_ZONE,
  });
};

const formatTime = (dateValue) => {
  if (!dateValue) return "--:--";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("es-MX", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateTime = (dateValue) => {
  if (!dateValue) return "--/--/---- --:--";
  return `${formatDate(dateValue)} ${formatTime(dateValue)}`;
};

const wrapText = (text = "", width = WIDTH) => {
  const clean = normalizeSpaces(text);
  if (!clean) return [];

  const words = clean.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;

    if (test.length <= width) {
      current = test;
      continue;
    }

    if (current) lines.push(current);

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

  if (current) lines.push(current);

  return lines;
};

const pushWrapped = (lines, text = "", width = WIDTH) => {
  wrapText(text, width).forEach((row) => lines.push(row));
};

const formatTotalLine = (label = "", value = "") => {
  const safeValue = String(value ?? "");
  const labelWidth = WIDTH - safeValue.length;

  return padRight(label, Math.max(1, labelWidth)) + safeValue;
};

const sectionTitle = (title = "") => {
  const clean = ` ${String(title).toUpperCase()} `;
  if (clean.length >= WIDTH) return clean.slice(0, WIDTH);

  const left = Math.floor((WIDTH - clean.length) / 2);
  const right = WIDTH - clean.length - left;

  return `${repeat("-", left)}${clean}${repeat("-", right)}`;
};

const getShortFolio = (saleId) =>
  saleId ? String(saleId).slice(0, 8).toUpperCase() : "--------";

const getMethodShort = (methodName = "") => {
  const name = String(methodName || "").trim().toUpperCase();

  if (!name) return "N/A";
  if (name.includes("EFECTIVO")) return "EFE";
  if (name.includes("TERMINAL") || name.includes("TARJETA")) return "TER";
  if (name.includes("TRANSFER")) return "TRA";
  if (name.includes("DÓLAR") || name.includes("DOLAR") || name.includes("USD")) {
    return "USD";
  }
  if (name.includes("MIXTO")) return "MIX";

  return "OTR";
};

const getMethodGroup = (methodName = "") => {
  const name = String(methodName || "").trim().toUpperCase();

  if (!name) return "OTRO";
  if (name.includes("EFECTIVO")) return "EFECTIVO";
  if (name.includes("TERMINAL") || name.includes("TARJETA")) return "TERMINAL";
  if (name.includes("TRANSFER")) return "TRANSFERENCIA";
  if (name.includes("DÓLAR") || name.includes("DOLAR") || name.includes("USD")) {
    return "DOLARES";
  }

  return name;
};

const getMethodDisplayName = (methodName = "") => {
  const group = getMethodGroup(methodName);

  if (group === "EFECTIVO") return "Efectivo";
  if (group === "TERMINAL") return "Terminal";
  if (group === "TRANSFERENCIA") return "Transfer.";
  if (group === "DOLARES") return "Dolares";

  return String(methodName || "Otro").slice(0, 15);
};

const safeUpper = (value = "") => String(value || "").toUpperCase();

const getDifferenceLabel = (difference) => {
  const diff = Number(difference || 0);

  if (diff > 0) return "Sobrante:";
  if (diff < 0) return "Faltante:";

  return "Diferencia:";
};

export const buildCashCutText = (data = {}) => {
  const {
    branchName,
    username,
    sessionId,
    openedAt,
    closedAt,

    cutCreatedAt,
    expectedAmount,
    countedAmount,
    difference,
    notes,
    isHistorical = false,

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

    rewardCanjesAplicados = 0,
    rewardPuntosUsados = 0,
    rewardCanjesRevertidos = 0,
    rewardPuntosDevueltos = 0,
  } = data;

  const expected =
    expectedAmount !== null && expectedAmount !== undefined
      ? Number(expectedAmount || 0)
      : Number(dineroCaja || 0);

  const counted =
    countedAmount !== null && countedAmount !== undefined
      ? Number(countedAmount || 0)
      : null;

  const diff =
    difference !== null && difference !== undefined
      ? Number(difference || 0)
      : counted !== null
      ? counted - expected
      : null;

  const totalCancelaciones = cancelaciones.reduce(
    (acc, item) => acc + Number(item.refund_amount || 0),
    0
  );

  const totalDevolucionesParciales = devolucionesParciales.reduce(
    (acc, item) => acc + Number(item.total_refund || 0),
    0
  );

  const hasRewardActivity =
    Number(rewardCanjesAplicados || 0) > 0 ||
    Number(rewardPuntosUsados || 0) > 0 ||
    Number(rewardCanjesRevertidos || 0) > 0 ||
    Number(rewardPuntosDevueltos || 0) > 0;

  const ventasNetas =
    Number(ventasTotales || 0) -
    Number(totalCancelaciones || 0) -
    Number(totalDevolucionesParciales || 0);

  const totalMetodos = ventasPorMetodo.reduce(
    (acc, item) => acc + Number(item.total || 0),
    0
  );

  const refundsByMethod = {};

  cancelaciones.forEach((item) => {
    const methodName = item.refund_method_name || "OTRO";
    const group = getMethodGroup(methodName);

    if (!refundsByMethod[group]) {
      refundsByMethod[group] = {
        label: getMethodDisplayName(methodName),
        total: 0,
      };
    }

    refundsByMethod[group].total += Number(item.refund_amount || 0);
  });

  devolucionesParciales.forEach((item) => {
    const methodName = item.refund_method_name || "OTRO";
    const group = getMethodGroup(methodName);

    if (!refundsByMethod[group]) {
      refundsByMethod[group] = {
        label: getMethodDisplayName(methodName),
        total: 0,
      };
    }

    refundsByMethod[group].total += Number(item.total_refund || 0);
  });

  const generatedAt = new Date();
  const cutDateToPrint = cutCreatedAt || generatedAt;

  const lines = [];

  lines.push(line());
  lines.push(centerText("CROKETS"));
  lines.push(centerText("CORTE DE CAJA"));
  lines.push(centerText(isHistorical ? "REIMPRESION" : "CORTE REALIZADO"));
  lines.push(line());

  lines.push(`Sucursal: ${safeUpper(branchName || "SUCURSAL")}`);
  lines.push(`Cajero: ${safeUpper(username || "USUARIO")}`);
  lines.push(`Turno: ${sessionId || "—"}`);
  lines.push(`Apertura: ${formatDateTime(openedAt)}`);
  lines.push(`Corte: ${formatDateTime(cutDateToPrint)}`);

  if (closedAt) {
    lines.push(`Cierre: ${formatDateTime(closedAt)}`);
  }

  lines.push(`Generado: ${formatDateTime(generatedAt)}`);
  lines.push(line());

  lines.push(centerText("RESULTADO DEL CORTE"));
  lines.push(line());
  lines.push(formatTotalLine("Esperado:", formatMoney(expected)));

  if (counted !== null) {
    lines.push(formatTotalLine("Contado:", formatMoney(counted)));
  }

  if (diff !== null) {
    lines.push(formatTotalLine(getDifferenceLabel(diff), formatMoney(diff)));
  }

  if (notes) {
    lines.push(dash());
    lines.push("Notas:");
    pushWrapped(lines, notes, WIDTH);
  }

  lines.push(dash());

  lines.push(sectionTitle("RESUMEN NETO"));
  lines.push(formatTotalLine("Ventas brutas:", formatMoney(ventasTotales)));
  lines.push(
    formatTotalLine("Cancelaciones:", formatNegativeMoney(totalCancelaciones))
  );
  lines.push(
    formatTotalLine(
      "Dev. parciales:",
      formatNegativeMoney(totalDevolucionesParciales)
    )
  );
  lines.push(formatTotalLine("Ventas netas:", formatMoney(ventasNetas)));
  lines.push(formatTotalLine("Caja esperada:", formatMoney(expected)));
  lines.push(dash());

  lines.push(sectionTitle("DINERO EN CAJA"));
  lines.push(formatTotalLine("Fondo inicial:", formatMoney(openingAmount)));
  lines.push(formatTotalLine("Entradas:", formatPositiveMoney(totalEntradas)));
  lines.push(
    formatTotalLine("Vtas efectivo:", formatPositiveMoney(ventasEfectivo))
  );

  if (Number(ventasDolaresUsd || 0) > 0 || Number(ventasDolaresMxn || 0) > 0) {
    lines.push(
      formatTotalLine(
        "Vtas USD:",
        `+USD ${Number(ventasDolaresUsd || 0).toFixed(2)}`
      )
    );
    lines.push(
      formatTotalLine("USD a MXN:", formatPositiveMoney(ventasDolaresMxn))
    );
  }

  lines.push(formatTotalLine("Salidas:", formatNegativeMoney(totalSalidas)));
  lines.push(
    formatTotalLine("Canc. caja:", formatNegativeMoney(devolucionesCaja))
  );
  lines.push(
    formatTotalLine("Dev. caja:", formatNegativeMoney(devolucionesParcialesCaja))
  );
  lines.push(formatTotalLine("TOTAL CAJA:", formatMoney(expected)));
  lines.push(dash());

  lines.push(sectionTitle("METODOS DE PAGO"));

  if (ventasPorMetodo.length === 0) {
    lines.push("Sin registros");
  } else {
    ventasPorMetodo.forEach((method) => {
      const methodName = String(method.name || "OTRO");
      const name = getMethodDisplayName(methodName);
      const isDollars =
        methodName.toUpperCase().includes("DOLAR") ||
        methodName.toUpperCase().includes("DÓLAR");

      if (isDollars) {
        lines.push(
          formatTotalLine(
            `${name} bruto:`,
            `USD ${Number(ventasDolaresUsd || method.total || 0).toFixed(2)}`
          )
        );

        if (Number(ventasDolaresMxn || 0) > 0) {
          lines.push(formatTotalLine("Eq. MXN:", formatMoney(ventasDolaresMxn)));
        }
      } else {
        lines.push(formatTotalLine(`${name} bruto:`, formatMoney(method.total)));
      }
    });

    const refundGroups = Object.entries(refundsByMethod).filter(
      ([, value]) => Number(value.total || 0) > 0
    );

    if (refundGroups.length > 0) {
      lines.push(dash());
      lines.push("Reembolsos:");

      refundGroups.forEach(([, value]) => {
        lines.push(
          formatTotalLine(
            `${value.label}:`,
            formatNegativeMoney(Number(value.total || 0))
          )
        );
      });
    }

    lines.push(dash());
    lines.push(formatTotalLine("TOTAL BRUTO:", formatMoney(totalMetodos)));
    lines.push(
      formatTotalLine(
        "TOTAL REEMB:",
        formatNegativeMoney(totalCancelaciones + totalDevolucionesParciales)
      )
    );
    lines.push(formatTotalLine("TOTAL NETO:", formatMoney(ventasNetas)));
  }

  lines.push(dash());

  lines.push(sectionTitle("ENTRADAS"));

  if (entradas.length === 0) {
    lines.push("Sin registros");
  } else {
    entradas.forEach((entry) => {
      const label = entry.description
        ? String(entry.description).slice(0, 17)
        : formatTime(entry.created_at);

      lines.push(formatTotalLine(label, formatPositiveMoney(entry.amount)));
    });

    lines.push(
      formatTotalLine("TOTAL ENTR:", formatPositiveMoney(totalEntradas))
    );
  }

  lines.push(dash());

  lines.push(sectionTitle("SALIDAS"));

  if (salidas.length === 0) {
    lines.push("Sin registros");
  } else {
    salidas.forEach((exit) => {
      const label = exit.description
        ? String(exit.description).slice(0, 17)
        : formatTime(exit.created_at);

      lines.push(formatTotalLine(label, formatNegativeMoney(exit.amount)));
    });

    lines.push(formatTotalLine("TOTAL SAL:", formatNegativeMoney(totalSalidas)));
  }

  lines.push(dash());

  lines.push(sectionTitle("VENTAS"));
  lines.push(formatTotalLine("Subtotal:", formatMoney(subtotal)));

  if (Number(discount || 0) > 0) {
    lines.push(formatTotalLine("Descuento:", formatNegativeMoney(discount)));
  } else {
    lines.push(formatTotalLine("Descuento:", formatMoney(0)));
  }

  lines.push(formatTotalLine("IVA:", formatMoney(tax)));
  lines.push(formatTotalLine("TOTAL BRUTO:", formatMoney(ventasTotales)));
  lines.push(formatTotalLine("TOTAL NETO:", formatMoney(ventasNetas)));
  lines.push(dash());

  lines.push(sectionTitle("RECOMPENSAS"));

  if (!hasRewardActivity) {
    lines.push("Sin registros");
  } else {
    if (Number(rewardCanjesAplicados || 0) > 0) {
      lines.push(
        formatTotalLine(
          "Canjes aplic:",
          String(Number(rewardCanjesAplicados || 0))
        )
      );
      lines.push(
        formatTotalLine(
          "Pts usados:",
          `-${Number(rewardPuntosUsados || 0)} pts`
        )
      );
    }

    if (Number(rewardCanjesRevertidos || 0) > 0) {
      lines.push(
        formatTotalLine(
          "Canjes rev:",
          String(Number(rewardCanjesRevertidos || 0))
        )
      );
      lines.push(
        formatTotalLine(
          "Pts devueltos:",
          `+${Number(rewardPuntosDevueltos || 0)} pts`
        )
      );
    }
  }

  lines.push(dash());

  lines.push(sectionTitle("CANCELACIONES"));

  if (cancelaciones.length === 0) {
    lines.push("Sin registros");
  } else {
    cancelaciones.forEach((cancelation) => {
      const folio = getShortFolio(cancelation.sale_id);
      const method = getMethodShort(cancelation.refund_method_name);

      lines.push(
        formatTotalLine(
          `${folio} ${method}`,
          formatNegativeMoney(cancelation.refund_amount)
        )
      );

      if (cancelation.canceled_at) {
        lines.push(`Hora: ${formatTime(cancelation.canceled_at)}`);
      }

      const reason =
        cancelation.cancel_reason?.trim() || "Sin motivo registrado";

      pushWrapped(lines, `Motivo: ${reason}`, WIDTH);
      lines.push("");
    });

    lines.push(
      formatTotalLine("TOTAL CANC:", formatNegativeMoney(totalCancelaciones))
    );
  }

  lines.push(dash());

  lines.push(sectionTitle("DEV PARCIALES"));

  if (devolucionesParciales.length === 0) {
    lines.push("Sin registros");
  } else {
    devolucionesParciales.forEach((partialReturn) => {
      const folio = getShortFolio(partialReturn.sale_id);
      const method = getMethodShort(partialReturn.refund_method_name);

      lines.push(
        formatTotalLine(
          `${folio} ${method}`,
          formatNegativeMoney(partialReturn.total_refund)
        )
      );

      if (partialReturn.created_at) {
        lines.push(`Hora: ${formatTime(partialReturn.created_at)}`);
      }

      const reason =
        partialReturn.return_reason?.trim() || "Sin motivo registrado";

      pushWrapped(lines, `Motivo: ${reason}`, WIDTH);
      lines.push("");
    });

    lines.push(
      formatTotalLine(
        "TOTAL DEV:",
        formatNegativeMoney(totalDevolucionesParciales)
      )
    );
  }

  lines.push(dash());
  lines.push("");
  lines.push("");
  lines.push(centerText("Firma cajero"));
  lines.push("");
  lines.push("");
  lines.push(dash());
  lines.push("");
  lines.push("");
  lines.push(centerText("Firma supervisor"));
  lines.push("");
  lines.push("");
  lines.push(line());

  return lines.join("\n");
};