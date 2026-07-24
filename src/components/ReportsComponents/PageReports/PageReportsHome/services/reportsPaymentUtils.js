import {
  getMxnPaymentAmount,
  toNumber,
} from "./reportsDashboardUtils";

const normalizeText = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const canGenerateChange = (paymentMethodName) => {
  const normalizedName = normalizeText(paymentMethodName);

  return (
    normalizedName === "efectivo" ||
    normalizedName === "dolares" ||
    normalizedName === "dolar"
  );
};

export const groupPaymentsBySale = (paymentRows = []) => {
  const paymentsBySale = {};

  for (const payment of paymentRows) {
    if (!payment?.sale_id) continue;

    if (!paymentsBySale[payment.sale_id]) {
      paymentsBySale[payment.sale_id] = [];
    }

    paymentsBySale[payment.sale_id].push(payment);
  }

  return paymentsBySale;
};

export const getPaymentMethodMap = (
  paymentMethodRows = []
) => {
  return paymentMethodRows.reduce(
    (result, method) => {
      if (!method?.id) return result;

      result[method.id] = method;
      return result;
    },
    {}
  );
};

export const getAppliedPaymentsForSale = ({
  sale,
  payments = [],
  paymentMethodMap = {},
}) => {
  const saleTotal = Math.max(
    toNumber(sale?.total),
    0
  );

  if (saleTotal <= 0 || payments.length === 0) {
    return [];
  }

  const normalizedPayments = payments
    .map((payment) => {
      const method =
        paymentMethodMap[
          payment.payment_method_id
        ] || null;

      return {
        paymentMethodId:
          payment.payment_method_id,

        paymentMethodName:
          method?.name ||
          "Método desconocido",

        amount: Math.max(
          getMxnPaymentAmount(payment),
          0
        ),
      };
    })
    .filter(
      (payment) =>
        payment.paymentMethodId &&
        payment.amount > 0
    );

  const totalReceived = normalizedPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  if (totalReceived <= saleTotal) {
    return normalizedPayments;
  }

  const appliedPayments = normalizedPayments.map(
    (payment) => ({
      ...payment,
    })
  );

  let remainingExcess =
    totalReceived - saleTotal;

  remainingExcess = subtractExcessFromPayments({
    payments: appliedPayments,
    remainingExcess,
    predicate: (payment) =>
      canGenerateChange(payment.paymentMethodName),
  });

  subtractExcessFromPayments({
    payments: appliedPayments,
    remainingExcess,
  });

  return appliedPayments.filter(
    (payment) => payment.amount > 0
  );
};

const subtractExcessFromPayments = ({
  payments,
  remainingExcess,
  predicate = () => true,
}) => {
  let pendingExcess = remainingExcess;

  for (
    let index = payments.length - 1;
    index >= 0 && pendingExcess > 0;
    index -= 1
  ) {
    const payment = payments[index];

    if (!predicate(payment)) continue;

    const discount = Math.min(
      payment.amount,
      pendingExcess
    );

    payment.amount -= discount;
    pendingExcess -= discount;
  }

  return pendingExcess;
};
