import {
  TICKET_WIDTH,
  separator,
  strongSeparator,
  centerText,
  money,
  wrapText,
  formatItemLine,
  formatTotalLine,
  pushItemDetailLines,
  pushWrappedLeft,
} from "./ticketLayoutFormatters";
import { formatDate, formatTime, formatDateTime } from "./ticketDateFormatters";
import {
  getItemDescription,
  getItemQuantity,
  getItemLineTotal,
  getItemOriginalUnitPrice,
  getItemPaidUnitPrice,
  getItemDiscountAmount,
} from "./ticketItemFormatters";
import { getRewardVisualTypeForItem } from "./ticketRewardService";
import { formatBranchAddressLines } from "./ticketBranchFormatters";
import { getReturnPointsFromReturn } from "./ticketPointsService";

export const buildHeaderSection = (branch = {}) => {
  const lines = [];

  const branchName = branch.name || "SUCURSAL";
  const branchPhone = branch.phone || "";

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

  return lines;
};

export const buildSaleInfoSection = ({
  sale = {},
  saleDate,
  cashierName = "",
  customerName,
  customerPhone,
  isRewardOnlySale = false,
  hasRewards = false,
  isCancelled = false,
}) => {
  const lines = [];

  lines.push(strongSeparator());
  lines.push(`Fecha: ${formatDate(saleDate)}`);
  lines.push(`Hora : ${formatTime(saleDate)}`);
  lines.push(
    `Cajero: ${(cashierName || sale.cashier_name || "").toUpperCase()}`
  );
  lines.push(`Folio : ${sale.folio || "-"}`);

  if (customerName) {
    lines.push(`Cliente: ${customerName}`);

    if (customerPhone) {
      lines.push(`Tel. cliente: ${customerPhone}`);
    }
  } else {
    lines.push("Cliente: PÚBLICO EN GENERAL");
  }

  if (isRewardOnlySale) {
    lines.push(
      isCancelled
        ? "Operación: CANJE CANCELADO"
        : "Operación: CANJE DE RECOMPENSA"
    );
  } else if (hasRewards) {
    lines.push(
      isCancelled
        ? "Incluye recompensa revertida"
        : "Incluye recompensa aplicada"
    );
  }

  lines.push(separator());

  return lines;
};

export const buildItemsSection = (
  items = [],
  { isCancelled = false, rewardRedemptions = [] } = {}
) => {
  const lines = [];

  lines.push(formatItemLine("Cant", "Descripción", "Importe"));
  lines.push(separator());

  items.forEach((item) => {
    const quantity = String(item.quantity ?? item.qty ?? item.cantidad ?? 0);
    const quantityNumber = getItemQuantity(item);
    const isKit = Boolean(item.is_kit || item.isKit);

    const rewardVisualType = getRewardVisualTypeForItem(item, rewardRedemptions);
    const isFreeRewardLine = rewardVisualType === "free_product";
    const isDiscountRewardLine = rewardVisualType === "product_discount";

    const descriptionRaw = getItemDescription(item);

    let description = descriptionRaw;

    if (isKit) {
      description = `${description} (KIT)`;
    }

    if (isFreeRewardLine) {
      description = `${description} (RECOMPENSA)`;
    }

    if (isDiscountRewardLine) {
      description = `${description} (DESC. RECOMP.)`;
    }

    const originalUnitPrice = getItemOriginalUnitPrice(item);
    const lineTotal = getItemLineTotal(item);
    const paidUnitPrice =
      quantityNumber > 0 && lineTotal > 0
        ? lineTotal / quantityNumber
        : getItemPaidUnitPrice(item);
    const finalUnitPrice = paidUnitPrice;
    const discountAmount = getItemDiscountAmount(item);

    const descWidthForWrap = TICKET_WIDTH - 5 - 1 - 9;
    const descLines = wrapText(description.toUpperCase(), descWidthForWrap);

    lines.push(
      formatItemLine(quantity, descLines[0] || "", lineTotal.toFixed(2))
    );

    for (let i = 1; i < descLines.length; i++) {
      lines.push(formatItemLine("", descLines[i], ""));
    }

    if (isFreeRewardLine) {
      pushItemDetailLines(lines, `Valor ${money(originalUnitPrice)}`);
      pushItemDetailLines(
        lines,
        isCancelled ? "Canje revertido" : "Canje por puntos"
      );
    } else if (isDiscountRewardLine) {
      const calculatedDiscountAmount = Math.max(
        originalUnitPrice - finalUnitPrice,
        0
      );

      const rewardDiscountAmount =
        calculatedDiscountAmount > 0
          ? calculatedDiscountAmount
          : discountAmount > 0 && discountAmount < originalUnitPrice
            ? discountAmount
            : 0;

      pushItemDetailLines(lines, "Descuento recompensa");
      pushItemDetailLines(lines, `Precio orig. ${money(originalUnitPrice)}`);

      if (rewardDiscountAmount > 0) {
        pushItemDetailLines(lines, `Desc. ${money(rewardDiscountAmount)} c/u`);
      }

      if (isCancelled) {
        pushItemDetailLines(lines, "Recompensa revertida");
      }
    } else {
      pushItemDetailLines(lines, `P.U. ${money(originalUnitPrice)}`);

      if (discountAmount > 0 && originalUnitPrice > finalUnitPrice) {
        pushItemDetailLines(
          lines,
          `Desc. ${money(originalUnitPrice - finalUnitPrice)} c/u`
        );
      }
    }

    const components = item.components || item.kit_components || item.kitItems;

    if (isKit && Array.isArray(components) && components.length > 0) {
      components.forEach((component) => {
        const componentName =
          component.name ||
          component.product_name ||
          component.description ||
          "COMPONENTE";

        const componentQty = Number(component.quantity ?? component.qty ?? 0);

        const componentText = `- ${componentName} x${componentQty}`;
        const componentLines = wrapText(
          componentText.toUpperCase(),
          descWidthForWrap
        );

        lines.push(formatItemLine("", componentLines[0] || "", ""));

        for (let i = 1; i < componentLines.length; i++) {
          lines.push(formatItemLine("", componentLines[i], ""));
        }
      });
    }

    lines.push("");
  });

  return lines;
};

export const buildTotalsSection = (items = [], sale = {}) => {
  const lines = [];

  const itemCount = items.reduce(
    (acc, item) => acc + Number(item.quantity ?? item.qty ?? item.cantidad ?? 0),
    0
  );

  lines.push(separator());
  lines.push(`Artículos: ${itemCount}`);
  lines.push(formatTotalLine("Subtotal:", money(sale.subtotal)));

  if (Number(sale.discount_total || 0) > 0) {
    lines.push(formatTotalLine("Descuento:", `-${money(sale.discount_total)}`));
  }

  lines.push(formatTotalLine("IVA 16%:", money(sale.tax ?? sale.iva)));
  lines.push(formatTotalLine("TOTAL:", money(sale.total)));
  lines.push(separator());

  return lines;
};

export const buildPaymentsSection = (
  payments = [],
  { sale = {}, paymentLabel = "", totalPaidInMxn = 0, showReceivedAndChange = false } = {}
) => {
  const lines = [];

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

  return lines;
};

export const buildCustomerPointsSection = ({
  customerName,
  earnedPoints = 0,
  returnedPoints = 0,
  rewardPointsUsed = 0,
  customerPointsBalance = null,
  hasPartialReturns = false,
  isCancelled = false,
  netPoints = 0,
}) => {
  const lines = [];

  if (
    customerName &&
    (earnedPoints > 0 ||
      returnedPoints > 0 ||
      rewardPointsUsed > 0 ||
      customerPointsBalance !== null)
  ) {
    lines.push(separator());
    lines.push(centerText("PUNTOS DEL CLIENTE"));

    if (earnedPoints > 0) {
      if (isCancelled) {
        lines.push(formatTotalLine("Puntos descontados:", `-${earnedPoints}`));
      } else {
        lines.push(formatTotalLine("Puntos ganados:", `+${earnedPoints}`));
      }
    }

    if (returnedPoints > 0) {
      lines.push(formatTotalLine("Puntos devolución:", `-${returnedPoints}`));
    }

    if (rewardPointsUsed > 0) {
      if (isCancelled) {
        lines.push(formatTotalLine("Puntos devueltos:", `+${rewardPointsUsed}`));
      } else {
        lines.push(formatTotalLine("Puntos canjeados:", `-${rewardPointsUsed}`));
      }
    }

    if (hasPartialReturns || returnedPoints > 0) {
      lines.push(formatTotalLine("Puntos netos:", `+${netPoints}`));
    }

    if (
      customerPointsBalance !== null &&
      !Number.isNaN(customerPointsBalance)
    ) {
      lines.push(
        formatTotalLine("Saldo puntos:", `${customerPointsBalance} pts`)
      );
    }
  }

  return lines;
};

export const buildRewardsSection = (
  rewardRedemptions = [],
  { isCancelled = false, rewardCount = 0, rewardPointsUsed = 0 } = {}
) => {
  const lines = [];

  if (rewardRedemptions.length > 0) {
    lines.push(separator());
    lines.push(
      centerText(
        isCancelled ? "RECOMPENSAS REVERTIDAS" : "RECOMPENSAS CANJEADAS"
      )
    );

    lines.push(
      formatTotalLine(
        isCancelled ? "Canjes revertidos:" : "Canjes aplicados:",
        rewardCount
      )
    );

    if (rewardPointsUsed > 0) {
      lines.push(
        formatTotalLine(
          isCancelled ? "Puntos devueltos:" : "Puntos usados:",
          isCancelled ? `+${rewardPointsUsed}` : `-${rewardPointsUsed}`
        )
      );
    }

    lines.push(separator());

    rewardRedemptions.forEach((reward, index) => {
      lines.push(
        isCancelled ? `Canje revertido #${index + 1}` : `Canje #${index + 1}`
      );

      wrapText(reward.rewardName || "RECOMPENSA", TICKET_WIDTH).forEach(
        (line) => {
          lines.push(line);
        }
      );

      if (reward.rewardType === "product_discount") {
        lines.push("Tipo: DESCUENTO EN PRODUCTO");

        if (
          !isCancelled &&
          reward.discountAmount > 0 &&
          reward.discountAmount < reward.unitPrice
        ) {
          lines.push(
            formatTotalLine("Descuento:", `-${money(reward.discountAmount)}`)
          );
        }

        if (
          isCancelled &&
          reward.discountAmount > 0 &&
          reward.discountAmount < reward.unitPrice
        ) {
          lines.push(
            formatTotalLine(
              "Desc. revertido:",
              `+${money(reward.discountAmount)}`
            )
          );
        }
      } else {
        lines.push("Tipo: PRODUCTO GRATIS");
      }

      if (reward.productName) {
        wrapText(`Producto: ${reward.productName}`, TICKET_WIDTH).forEach(
          (line) => {
            lines.push(line);
          }
        );
      }

      lines.push(formatTotalLine("Cantidad:", `x${reward.quantity}`));

      if (reward.totalPoints > 0) {
        lines.push(
          formatTotalLine(
            isCancelled ? "Puntos devueltos:" : "Puntos:",
            isCancelled ? `+${reward.totalPoints}` : `-${reward.totalPoints}`
          )
        );
      }

      if (isCancelled && reward.reversalReason) {
        lines.push("Motivo reversa:");
        wrapText(reward.reversalReason, TICKET_WIDTH).forEach((line) => {
          lines.push(line);
        });
      }

      if (index < rewardRedemptions.length - 1) {
        lines.push(separator("-"));
      }
    });
  }

  return lines;
};

export const buildCancellationSection = (
  sale = {},
  { isCancelled = false, cancelledAt = null } = {}
) => {
  const lines = [];

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

  return lines;
};

export const buildPartialReturnsSection = (
  partialReturns = [],
  { sale = {}, returnedPoints = 0 } = {}
) => {
  const lines = [];

  if (partialReturns.length > 0) {
    lines.push(centerText("*** DEVOLUCIONES PARCIALES ***"));
    lines.push(
      formatTotalLine("Devuelto acum.:", money(sale.total_returned || 0))
    );
    lines.push(
      formatTotalLine("Neto actual:", money(sale.net_total ?? sale.total))
    );

    if (returnedPoints > 0) {
      lines.push(formatTotalLine("Puntos devolución:", `-${returnedPoints}`));
    }

    lines.push(separator());

    partialReturns.forEach((ret, index) => {
      lines.push(`Devolución #${index + 1}`);

      if (ret.created_at) {
        lines.push(`Fecha: ${formatDate(ret.created_at)}`);
        lines.push(`Hora : ${formatTime(ret.created_at)}`);
      }

      lines.push(`Método: ${String(ret.refund_method || "N/A").toUpperCase()}`);

      lines.push(
        formatTotalLine("Monto devuelto:", money(ret.total_refund || 0))
      );

      const returnPoints = getReturnPointsFromReturn(ret);

      if (returnPoints > 0) {
        lines.push(formatTotalLine("Puntos desc.:", `-${returnPoints}`));
      }

      lines.push("Motivo:");
      wrapText(ret.return_reason || "SIN MOTIVO REGISTRADO", TICKET_WIDTH).forEach(
        (line) => lines.push(line)
      );

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

  return lines;
};

export const buildReprintSection = (isReprint = false, reprintedAt = null) => {
  const lines = [];

  if (isReprint) {
    lines.push(centerText("*** COPIA DE TICKET ***"));
    lines.push(`Reimpreso: ${formatDateTime(reprintedAt || new Date())}`);
    lines.push(separator());
  }

  return lines;
};

export const buildNotesSection = (sale = {}) => {
  const lines = [];

  const saleNotes = String(sale.notes || "").trim();

  if (saleNotes) {
    lines.push("Notas:");
    wrapText(saleNotes, TICKET_WIDTH).forEach((line) => lines.push(line));
    lines.push(separator());
  }

  return lines;
};

export const buildFooterSection = (footer = {}) => {
  const lines = [];

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

  return lines;
};
