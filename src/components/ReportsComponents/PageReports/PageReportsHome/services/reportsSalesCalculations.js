import {
  CANCUN_OFFSET,
  DASHBOARD_DAYS,
  formatChartDayLabel,
  getDateInputFromIso,
  getDateInputValue,
  getMxnPaymentAmount,
  isCompletedSale,
  toNumber,
} from "./reportsDashboardUtils";

const normalizeText = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const canGenerateChange = (
  paymentMethodName
) => {
  const normalizedName = normalizeText(
    paymentMethodName
  );

  return (
    normalizedName === "efectivo" ||
    normalizedName === "dolares" ||
    normalizedName === "dolar"
  );
};

const groupPaymentsBySale = (
  paymentRows = []
) => {
  const paymentsBySale = {};

  for (const payment of paymentRows) {
    if (!payment?.sale_id) continue;

    if (!paymentsBySale[payment.sale_id]) {
      paymentsBySale[payment.sale_id] = [];
    }

    paymentsBySale[payment.sale_id].push(
      payment
    );
  }

  return paymentsBySale;
};

const getPaymentMethodMap = (
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

const getAppliedPaymentsForSale = ({
  sale,
  payments,
  paymentMethodMap,
}) => {
  const saleTotal = Math.max(
    toNumber(sale?.total),
    0
  );

  if (saleTotal <= 0 || !payments.length) {
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

  const totalReceived =
    normalizedPayments.reduce(
      (sum, payment) =>
        sum + payment.amount,
      0
    );

  if (totalReceived <= saleTotal) {
    return normalizedPayments;
  }

  let remainingExcess =
    totalReceived - saleTotal;

  const appliedPayments =
    normalizedPayments.map((payment) => ({
      ...payment,
    }));

  for (
    let index = appliedPayments.length - 1;
    index >= 0 && remainingExcess > 0;
    index -= 1
  ) {
    const payment = appliedPayments[index];

    if (
      !canGenerateChange(
        payment.paymentMethodName
      )
    ) {
      continue;
    }

    const discount = Math.min(
      payment.amount,
      remainingExcess
    );

    payment.amount -= discount;
    remainingExcess -= discount;
  }

  for (
    let index = appliedPayments.length - 1;
    index >= 0 && remainingExcess > 0;
    index -= 1
  ) {
    const payment = appliedPayments[index];

    const discount = Math.min(
      payment.amount,
      remainingExcess
    );

    payment.amount -= discount;
    remainingExcess -= discount;
  }

  return appliedPayments.filter(
    (payment) => payment.amount > 0
  );
};

export const buildSalesChart = ({
  sales = [],
  returnedAmountBySale = {},
  firstDateInput,
}) => {
  const totalsByDate = {};

  for (
    let index = 0;
    index < DASHBOARD_DAYS;
    index += 1
  ) {
    const date = new Date(
      `${firstDateInput}T12:00:00${CANCUN_OFFSET}`
    );

    date.setDate(date.getDate() + index);

    const dateInput =
      getDateInputValue(date);

    totalsByDate[dateInput] = {
      date: dateInput,
      label:
        formatChartDayLabel(dateInput),
      total: 0,
      tickets: 0,
    };
  }

  for (const sale of sales) {
    if (!isCompletedSale(sale)) continue;

    const dateInput =
      getDateInputFromIso(
        sale.sale_date
      );

    if (!totalsByDate[dateInput]) {
      continue;
    }

    const returnedAmount = toNumber(
      returnedAmountBySale[sale.id]
    );

    const netTotal = Math.max(
      toNumber(sale.total) -
        returnedAmount,
      0
    );

    totalsByDate[dateInput].total +=
      netTotal;

    totalsByDate[dateInput].tickets += 1;
  }

  return Object.values(totalsByDate);
};

export const buildTopProduct = ({
  detailRows = [],
  validSaleIds,
  returnedQuantityByProduct = {},
  returnedAmountByProduct = {},
  productRows = [],
}) => {
  const quantityByProduct = {};
  const amountByProduct = {};

  for (const detail of detailRows) {
    if (!validSaleIds.has(detail.sale_id)) {
      continue;
    }

    if (!detail.product_id) continue;

    quantityByProduct[detail.product_id] =
      toNumber(
        quantityByProduct[
          detail.product_id
        ]
      ) + toNumber(detail.quantity);

    amountByProduct[detail.product_id] =
      toNumber(
        amountByProduct[
          detail.product_id
        ]
      ) + toNumber(detail.total_price);
  }

  for (const productId of Object.keys(
    quantityByProduct
  )) {
    quantityByProduct[productId] =
      Math.max(
        toNumber(
          quantityByProduct[productId]
        ) -
          toNumber(
            returnedQuantityByProduct[
              productId
            ]
          ),
        0
      );

    amountByProduct[productId] =
      Math.max(
        toNumber(
          amountByProduct[productId]
        ) -
          toNumber(
            returnedAmountByProduct[
              productId
            ]
          ),
        0
      );
  }

  const topProductId = Object.keys(
    quantityByProduct
  ).sort((firstId, secondId) => {
    const quantityDifference =
      quantityByProduct[secondId] -
      quantityByProduct[firstId];

    if (quantityDifference !== 0) {
      return quantityDifference;
    }

    return (
      toNumber(
        amountByProduct[secondId]
      ) -
      toNumber(
        amountByProduct[firstId]
      )
    );
  })[0];

  if (
    !topProductId ||
    quantityByProduct[topProductId] <= 0
  ) {
    return null;
  }

  const product = productRows.find(
    (row) => row.id === topProductId
  );

  return {
    id: topProductId,

    name:
      product?.name ||
      product?.barcode ||
      "Producto",

    barcode: product?.barcode || "",

    quantity: toNumber(
      quantityByProduct[topProductId]
    ),

    amount: toNumber(
      amountByProduct[topProductId]
    ),
  };
};

export const buildMainPaymentMethod = ({
  salesRows = [],
  paymentRows = [],
  validSaleIds,
  paymentMethodRows = [],
}) => {
  const amountByMethod = {};

  const paymentMethodMap =
    getPaymentMethodMap(
      paymentMethodRows
    );

  const paymentsBySale =
    groupPaymentsBySale(paymentRows);

  for (const sale of salesRows) {
    if (!validSaleIds.has(sale.id)) {
      continue;
    }

    const salePayments =
      paymentsBySale[sale.id] || [];

    const appliedPayments =
      getAppliedPaymentsForSale({
        sale,
        payments: salePayments,
        paymentMethodMap,
      });

    for (const payment of appliedPayments) {
      amountByMethod[
        payment.paymentMethodId
      ] =
        toNumber(
          amountByMethod[
            payment.paymentMethodId
          ]
        ) + toNumber(payment.amount);
    }
  }

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

  return {
    id: topMethodId,

    name:
      method?.name ||
      "Método desconocido",

    amount: toNumber(
      amountByMethod[topMethodId]
    ),
  };
};