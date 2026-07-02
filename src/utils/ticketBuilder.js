const TICKET_WIDTH = 32;
const TIME_ZONE = "America/Cancun";

const separator = (char = "-") => char.repeat(TICKET_WIDTH);
const strongSeparator = (char = "=") => char.repeat(TICKET_WIDTH);

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

const normalizeUpper = (text = "") => normalizeSpaces(text).toUpperCase();

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

const pushItemDetailLines = (lines, text = "") => {
  const indent = "     ";
  const width = TICKET_WIDTH - indent.length;

  wrapText(text, width).forEach((line) => {
    lines.push(`${indent}${line}`);
  });
};

const toNumber = (value) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getItemDescription = (item = {}) => {
  return normalizeUpper(
    item.description ||
      item.product_name ||
      item.productName ||
      item.name ||
      item.nombre ||
      "PRODUCTO"
  );
};

const getItemQuantity = (item = {}) => {
  const quantity = toNumber(item.quantity ?? item.qty ?? item.cantidad ?? 0);
  return quantity > 0 ? quantity : 1;
};

const getItemLineTotal = (item = {}) => {
  return toNumber(
    item.total ?? item.line_total ?? item.total_price ?? item.importe ?? 0
  );
};

const getItemOriginalUnitPrice = (item = {}) => {
  const fallbackPrice = toNumber(
    item.unit_price ?? item.price ?? item.precio ?? 0
  );

  return toNumber(
    item.original_unit_price ??
      item.originalUnitPrice ??
      item.precioOriginal ??
      fallbackPrice
  );
};

const getItemFinalUnitPrice = (item = {}) => {
  return toNumber(
    item.final_unit_price ??
      item.finalUnitPrice ??
      item.unit_price ??
      item.price ??
      item.precio ??
      0
  );
};

const getItemPaidUnitPrice = (item = {}) => {
  const quantity = getItemQuantity(item);
  const lineTotal = getItemLineTotal(item);

  if (quantity > 0 && lineTotal > 0) {
    return lineTotal / quantity;
  }

  return getItemFinalUnitPrice(item);
};

const getItemDiscountAmount = (item = {}) => {
  return toNumber(
    item.reward_discount_amount ??
      item.rewardDiscountAmount ??
      item.discount_amount ??
      item.discountAmount ??
      item.descuentoMonto ??
      0
  );
};

const getRewardTypeFromValue = (value = {}) => {
  const rawType = normalizeSpaces(
    value.reward_type ||
      value.rewardType ||
      value.type ||
      value.reward?.reward_type ||
      value.rewards?.reward_type ||
      ""
  ).toLowerCase();

  if (rawType === "product_discount") return "product_discount";
  if (rawType === "free_product") return "free_product";

  return "";
};

const isRewardDiscountItem = (item = {}) => {
  const rewardType = getRewardTypeFromValue(item);
  const lineTotal = getItemLineTotal(item);
  const discountAmount = getItemDiscountAmount(item);
  const originalUnitPrice = getItemOriginalUnitPrice(item);
  const paidUnitPrice = getItemPaidUnitPrice(item);

  const rewardName = normalizeUpper(
    item.reward_name ||
      item.rewardName ||
      item.discountConcept ||
      item.discount_concept ||
      item.reward?.name ||
      item.rewards?.name ||
      ""
  );

  const hasRewardIdentifier = Boolean(
    item.reward_id ||
      item.rewardId ||
      item.sale_reward_redemption_id ||
      item.saleRewardRedemptionId
  );

  return Boolean(
    item.is_reward_discount_item ||
      item.isRewardDiscountItem ||
      item.reward_discount_item ||
      item.rewardDiscountItem ||
      rewardType === "product_discount" ||
      rewardName.includes("DESCUENTO") ||
      rewardName.includes("DESC") ||
      rewardName.includes("%") ||
      rewardName.includes("OFF") ||
      (hasRewardIdentifier && lineTotal > 0 && discountAmount > 0) ||
      (hasRewardIdentifier &&
        lineTotal > 0 &&
        originalUnitPrice > paidUnitPrice)
  );
};

const isFreeRewardItem = (item = {}) => {
  const rewardType = getRewardTypeFromValue(item);

  if (isRewardDiscountItem(item)) return false;

  return Boolean(
    item.is_reward_item ||
      item.isRewardItem ||
      item.reward_item ||
      item.rewardItem ||
      item.is_reward ||
      item.isReward ||
      rewardType === "free_product" ||
      item.reward_id ||
      item.rewardId ||
      item.sale_reward_redemption_id ||
      item.saleRewardRedemptionId
  );
};

const isRewardItem = (item = {}) => {
  return isFreeRewardItem(item) || isRewardDiscountItem(item);
};

const getRewardItemsFromSale = (sale = {}) => {
  const possibleLists = [
    sale.reward_redemptions,
    sale.rewardRedemptions,
    sale.rewards_redeemed,
    sale.rewardsRedeemed,
    sale.redeemed_rewards,
    sale.redeemedRewards,
    sale.applied_rewards,
    sale.appliedRewards,
    sale.rewardItems,
    sale.reward_items,
  ];

  const directList = possibleLists.find((items) => Array.isArray(items));

  if (directList) return directList;

  return [];
};

const detectRewardType = (reward = {}) => {
  const explicitType = getRewardTypeFromValue(reward);
  const rewardName = normalizeUpper(
    reward.rewardName ||
      reward.reward_name ||
      reward.name ||
      reward.reward ||
      reward.rewards?.name ||
      ""
  );

  const discountAmount = toNumber(
    reward.discount_amount ||
      reward.discountAmount ||
      reward.reward_discount_amount ||
      reward.rewardDiscountAmount ||
      0
  );

  const unitPrice = toNumber(
    reward.unit_price ||
      reward.unitPrice ||
      reward.original_unit_price ||
      reward.originalUnitPrice ||
      0
  );

  const looksLikeDiscount = Boolean(
    rewardName.includes("DESCUENTO") ||
      rewardName.includes("DESC") ||
      rewardName.includes("%") ||
      rewardName.includes("OFF") ||
      discountAmount > 0
  );

  if (explicitType === "product_discount") return "product_discount";

  if (explicitType === "free_product") {
    return looksLikeDiscount ? "product_discount" : "free_product";
  }

  if (looksLikeDiscount || (discountAmount > 0 && unitPrice > 0)) {
    return "product_discount";
  }

  return "free_product";
};

const normalizeRewardRedemptions = (sale = {}, items = []) => {
  const rewardRows = getRewardItemsFromSale(sale);

  if (rewardRows.length > 0) {
    return rewardRows
      .map((reward) => {
        const rewardName =
          reward.reward_name ||
          reward.rewardName ||
          reward.name ||
          reward.reward ||
          reward.rewards?.name ||
          "RECOMPENSA";

        const productName =
          reward.product_name ||
          reward.productName ||
          reward.product ||
          reward.producto ||
          reward.products?.name ||
          "";

        const quantity = toNumber(
          reward.quantity ||
            reward.qty ||
            reward.reward_quantity ||
            reward.rewardQuantity ||
            reward.redeemQuantity ||
            1
        );

        const pointsPerUnit = Math.abs(
          toNumber(
            reward.points_per_unit ||
              reward.pointsPerUnit ||
              reward.reward_points ||
              reward.rewardPoints ||
              reward.points ||
              0
          )
        );

        const totalPoints = Math.abs(
          toNumber(
            reward.total_points ||
              reward.totalPoints ||
              reward.points_used ||
              reward.pointsUsed ||
              reward.total_reward_points ||
              reward.totalRewardPoints ||
              pointsPerUnit * (quantity || 1)
          )
        );

        return {
          rewardName: normalizeUpper(rewardName || "RECOMPENSA"),
          productName: normalizeUpper(productName || ""),
          quantity: quantity > 0 ? quantity : 1,
          pointsPerUnit,
          totalPoints,
          rewardType: detectRewardType(reward),
          unitPrice: toNumber(
            reward.unit_price ||
              reward.unitPrice ||
              reward.original_unit_price ||
              reward.originalUnitPrice ||
              0
          ),
          discountAmount: toNumber(
            reward.discount_amount ||
              reward.discountAmount ||
              reward.reward_discount_amount ||
              reward.rewardDiscountAmount ||
              0
          ),
          reversedAt:
            reward.reversed_at ||
            reward.reversedAt ||
            reward.reversal_date ||
            reward.reversalDate ||
            null,
          reversedBy: reward.reversed_by || reward.reversedBy || null,
          reversalReason:
            reward.reversal_reason || reward.reversalReason || "",
        };
      })
      .filter((reward) => reward.rewardName);
  }

  return (items || [])
    .filter((item) => isRewardItem(item))
    .map((item) => {
      const rewardName =
        item.reward_name ||
        item.rewardName ||
        item.reward?.name ||
        item.reward_label ||
        item.rewardLabel ||
        "RECOMPENSA";

      const productName =
        item.product_name ||
        item.productName ||
        item.description ||
        item.name ||
        item.nombre ||
        "PRODUCTO";

      const quantity = toNumber(item.quantity ?? item.qty ?? item.cantidad ?? 1);

      const pointsPerUnit = Math.abs(
        toNumber(
          item.points_per_unit ||
            item.pointsPerUnit ||
            item.reward_points ||
            item.rewardPoints ||
            item.points ||
            0
        )
      );

      const totalPoints = Math.abs(
        toNumber(
          item.total_points ||
            item.totalPoints ||
            item.points_used ||
            item.pointsUsed ||
            pointsPerUnit * (quantity || 1)
        )
      );

      return {
        rewardName: normalizeUpper(rewardName || "RECOMPENSA"),
        productName: normalizeUpper(productName || "PRODUCTO"),
        quantity: quantity > 0 ? quantity : 1,
        pointsPerUnit,
        totalPoints,
        rewardType: isRewardDiscountItem(item)
          ? "product_discount"
          : "free_product",
        unitPrice: getItemOriginalUnitPrice(item),
        discountAmount: getItemDiscountAmount(item),
        reversedAt:
          item.reversed_at ||
          item.reversedAt ||
          item.reversal_date ||
          item.reversalDate ||
          null,
        reversedBy: item.reversed_by || item.reversedBy || null,
        reversalReason: item.reversal_reason || item.reversalReason || "",
      };
    })
    .filter((reward) => reward.rewardName);
};

const getRewardPointsUsed = (sale = {}, items = []) => {
  const directValue = Math.abs(
    toNumber(
      sale.reward_points_used ??
        sale.rewardPointsUsed ??
        sale.points_used ??
        sale.pointsUsed ??
        sale.points_redeemed ??
        sale.pointsRedeemed ??
        sale.total_reward_points ??
        sale.totalRewardPoints ??
        sale.total_points_used ??
        sale.totalPointsUsed
    )
  );

  if (directValue > 0) return directValue;

  return normalizeRewardRedemptions(sale, items).reduce((acc, reward) => {
    return acc + Math.abs(toNumber(reward.totalPoints));
  }, 0);
};

const getRewardCount = (sale = {}, items = []) => {
  const directValue = toNumber(
    sale.rewards_count ??
      sale.rewardsCount ??
      sale.reward_redemptions_count ??
      sale.rewardRedemptionsCount ??
      sale.canjes_aplicados ??
      sale.canjesAplicados ??
      sale.rewards_applied_count ??
      sale.rewardsAppliedCount
  );

  if (directValue > 0) return directValue;

  return normalizeRewardRedemptions(sale, items).reduce((acc, reward) => {
    return acc + toNumber(reward.quantity || 1);
  }, 0);
};

const hasRewardActivity = (sale = {}, items = []) => {
  return Boolean(
    sale.is_reward_redemption_only ||
      sale.isRewardRedemptionOnly ||
      sale.is_zero_total_sale ||
      sale.isZeroTotalSale ||
      sale.has_reward_redemptions ||
      sale.hasRewardRedemptions ||
      getRewardPointsUsed(sale, items) > 0 ||
      getRewardCount(sale, items) > 0 ||
      (items || []).some((item) => isRewardItem(item))
  );
};

const getPaymentLabel = (
  payments = [],
  fallbackMethod = "",
  sale = {},
  items = []
) => {
  const total = toNumber(sale.total);
  const hasRewards = hasRewardActivity(sale, items);

  if (!payments.length && total <= 0 && hasRewards) {
    return "SIN PAGO";
  }

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
  const clean = normalizeUpper(state);

  const map = {
    "QUINTANA ROO": "QROO",
    "Q. ROO": "QROO",
    QUERETARO: "QRO",
    "CIUDAD DE MEXICO": "CDMX",
    "ESTADO DE MEXICO": "EDOMEX",
    "NUEVO LEON": "NL",
    JALISCO: "JAL",
    YUCATAN: "YUC",
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
  const city = normalizeUpper(branch.city || "");
  const state = formatStateShort(branch.state || "");
  const postalCode =
    extractPostalCode(rawAddress) ||
    extractPostalCode(branch.postal_code || "") ||
    extractPostalCode(branch.zip_code || "");

  const addressLine1 = normalizeAddressLine1(rawAddress);
  const addressLine2 = [
    city ? `${city},` : "",
    state,
    postalCode ? `CP ${postalCode}` : "",
  ]
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

const getCustomerName = (sale = {}) => {
  return normalizeUpper(
    sale.customer_name ||
      sale.customerName ||
      sale.customer?.name ||
      sale.customer?.full_name ||
      ""
  );
};

const getCustomerPhone = (sale = {}) => {
  return normalizeSpaces(
    sale.customer_phone ||
      sale.customerPhone ||
      sale.customer?.phone ||
      sale.customer?.phone_number ||
      ""
  );
};

const getEarnedPoints = (sale = {}) => {
  return Number(
    sale.points_earned ??
      sale.customer_points_earned ??
      sale.earned_points ??
      sale.pointsEarned ??
      0
  );
};

const getPartialReturnPointsFromMovements = (sale = {}) => {
  const saleId = String(sale.id || sale.sale_id || "").trim();

  const possibleLists = [
    sale.customer_points_movements,
    sale.customerPointsMovements,
    sale.points_movements,
    sale.pointsMovements,
    sale.customer_points,
    sale.customerPoints,
  ];

  const movements = possibleLists.find((list) => Array.isArray(list)) || [];

  return movements.reduce((acc, movement) => {
    const source = String(movement.source || "").toLowerCase();
    const points = Number(movement.points || 0);
    const relatedSaleId = String(
      movement.related_sale_id || movement.relatedSaleId || ""
    ).trim();

    const belongsToSale = !saleId || !relatedSaleId || relatedSaleId === saleId;
    const isPartialReturn = source === "partial_return";

    if (belongsToSale && isPartialReturn && points < 0) {
      return acc + Math.abs(points);
    }

    return acc;
  }, 0);
};

const getPartialReturnPointsFromReturns = (sale = {}) => {
  const partialReturns = sale.returns || sale.partial_returns || [];

  if (!Array.isArray(partialReturns)) return 0;

  return partialReturns.reduce((acc, ret) => {
    const points = Math.abs(
      toNumber(
        ret.points_returned ??
          ret.pointsReturned ??
          ret.points_deducted ??
          ret.pointsDeducted ??
          ret.returned_points ??
          ret.returnedPoints ??
          ret.partial_return_points ??
          ret.partialReturnPoints ??
          ret.customer_points_returned ??
          ret.customerPointsReturned ??
          0
      )
    );

    return acc + points;
  }, 0);
};

const getReturnedPoints = (sale = {}) => {
  const directValue = Math.abs(
    Number(
      sale.points_returned ??
        sale.customer_points_returned ??
        sale.partial_return_points ??
        sale.partialReturnPoints ??
        sale.pointsReturned ??
        sale.returned_points ??
        sale.returnedPoints ??
        sale.partial_return_points_returned ??
        sale.partialReturnPointsReturned ??
        sale.partial_return_points_deducted ??
        sale.partialReturnPointsDeducted ??
        sale.points_deducted_by_partial_return ??
        sale.pointsDeductedByPartialReturn ??
        sale.partial_return_points_discounted ??
        sale.partialReturnPointsDiscounted ??
        0
    )
  );

  if (directValue > 0) return directValue;

  const movementPoints = getPartialReturnPointsFromMovements(sale);

  if (movementPoints > 0) return movementPoints;

  const returnPoints = getPartialReturnPointsFromReturns(sale);

  if (returnPoints > 0) return returnPoints;

  return 0;
};

const getCustomerPointsBalance = (sale = {}) => {
  const value =
    sale.customer_points_balance ??
    sale.points_balance ??
    sale.pointsBalance ??
    sale.final_points_balance ??
    sale.finalPointsBalance ??
    sale.customer?.points ??
    sale.customer?.points_balance ??
    null;

  if (value === null || value === undefined || value === "") return null;

  return Number(value);
};

const findRewardForItem = (item = {}, rewardRedemptions = []) => {
  if (!item || rewardRedemptions.length === 0) return null;

  const itemRewardId = String(item.reward_id || item.rewardId || "").trim();

  if (itemRewardId) {
    const byId = rewardRedemptions.find((reward) => {
      return (
        String(reward.reward_id || reward.rewardId || "").trim() ===
        itemRewardId
      );
    });

    if (byId) return byId;
  }

  const itemName = getItemDescription(item);

  if (itemName) {
    const byProductName = rewardRedemptions.find((reward) => {
      return reward.productName && reward.productName === itemName;
    });

    if (byProductName) return byProductName;
  }

  return null;
};

const getRewardVisualTypeForItem = (item = {}, rewardRedemptions = []) => {
  if (isRewardDiscountItem(item)) return "product_discount";

  const matchedReward = findRewardForItem(item, rewardRedemptions);
  const matchedRewardName = normalizeUpper(matchedReward?.rewardName || "");
  const matchedLooksLikeDiscount = Boolean(
    matchedReward?.rewardType === "product_discount" ||
      matchedRewardName.includes("DESCUENTO") ||
      matchedRewardName.includes("DESC") ||
      matchedRewardName.includes("%") ||
      matchedRewardName.includes("OFF") ||
      toNumber(matchedReward?.discountAmount) > 0
  );

  if (matchedLooksLikeDiscount) return "product_discount";

  if (isFreeRewardItem(item)) return "free_product";

  if (!matchedReward) return "";

  if (
    getItemLineTotal(item) > 0 &&
    (getItemDiscountAmount(item) > 0 ||
      getItemOriginalUnitPrice(item) > getItemPaidUnitPrice(item))
  ) {
    return "product_discount";
  }

  return "free_product";
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
  const hasPartialReturns = partialReturns.length > 0;

  const rewardRedemptions = normalizeRewardRedemptions(sale, items);
  const hasRewards = hasRewardActivity(sale, items);
  const rewardPointsUsed = getRewardPointsUsed(sale, items);
  const rewardCount = getRewardCount(sale, items);
  const isRewardOnlySale = hasRewards && toNumber(sale.total) <= 0;

  const paymentLabel = getPaymentLabel(
    payments,
    sale.payment_method,
    sale,
    items
  );

  const totalPaidInMxn = getTotalPaidInMxn(
    payments,
    sale.amount_received ?? sale.paid_amount
  );

  const showReceivedAndChange = shouldShowReceivedAndChange(
    payments,
    sale.payment_method
  );

  const customerName = getCustomerName(sale);
  const customerPhone = getCustomerPhone(sale);

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

  const earnedPoints = getEarnedPoints(sale);
  const returnedPoints = getReturnedPoints(sale);
  const netPoints = Math.max(earnedPoints - returnedPoints, 0);
  const customerPointsBalance = getCustomerPointsBalance(sale);

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

      const returnPoints = Math.abs(
        toNumber(
          ret.points_returned ??
            ret.pointsReturned ??
            ret.points_deducted ??
            ret.pointsDeducted ??
            ret.returned_points ??
            ret.returnedPoints ??
            ret.partial_return_points ??
            ret.partialReturnPoints ??
            ret.customer_points_returned ??
            ret.customerPointsReturned ??
            0
        )
      );

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