import { toNumber } from "./reportsDashboardUtils";

import {
  getAppliedPaymentsForSale,
  getPaymentMethodMap,
  groupPaymentsBySale,
} from "./reportsPaymentUtils";

export const buildMainPaymentMethod = ({
  salesRows = [],
  paymentRows = [],
  validSaleIds,
  paymentMethodRows = [],
}) => {
  if (!(validSaleIds instanceof Set)) {
    return null;
  }

  const amountByMethod = {};

  const paymentMethodMap =
    getPaymentMethodMap(paymentMethodRows);

  const paymentsBySale =
    groupPaymentsBySale(paymentRows);

  for (const sale of salesRows) {
    if (!validSaleIds.has(sale.id)) {
      continue;
    }

    const appliedPayments =
      getAppliedPaymentsForSale({
        sale,
        payments: paymentsBySale[sale.id] || [],
        paymentMethodMap,
      });

    for (const payment of appliedPayments) {
      amountByMethod[payment.paymentMethodId] =
        toNumber(
          amountByMethod[
            payment.paymentMethodId
          ]
        ) + toNumber(payment.amount);
    }
  }

  const totalPaymentsAmount = Object.values(amountByMethod).reduce(
    (sum, val) => sum + toNumber(val),
    0
  );

  const topMethodId = Object.keys(
    amountByMethod
  ).sort(
    (firstId, secondId) =>
      amountByMethod[secondId] -
      amountByMethod[firstId]
  )[0];

  if (!topMethodId) return null;

  const method =
    paymentMethodMap[topMethodId] || null;

  const methodAmount = toNumber(
    amountByMethod[topMethodId]
  );

  const sharePercentage =
    totalPaymentsAmount > 0
      ? Math.round((methodAmount / totalPaymentsAmount) * 100)
      : 0;

  return {
    id: topMethodId,
    name:
      method?.name ||
      "Método desconocido",
    amount: methodAmount,
    sharePercentage,
  };
};
