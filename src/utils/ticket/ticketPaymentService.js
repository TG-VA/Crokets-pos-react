import { toNumber } from "./ticketItemFormatters";
import { hasRewardActivity } from "./ticketRewardService";

export const getPaymentLabel = (
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

export const getPaymentAmountInMxn = (payment = {}) => {
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

export const getTotalPaidInMxn = (payments = [], fallbackAmount = 0) => {
  if (!payments.length) return Number(fallbackAmount || 0);

  return payments.reduce((acc, payment) => {
    return acc + getPaymentAmountInMxn(payment);
  }, 0);
};

export const shouldShowReceivedAndChange = (payments = [], fallbackMethod = "") => {
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
