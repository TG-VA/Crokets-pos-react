const PAYMENT_METHOD_NAMES = {
  Efectivo: "Efectivo",
  Dolares: "Dólares",
  Terminal: "Terminal",
  Transferencia: "Transferencia",
};

const buildMixedPaymentsPayload = (
  paymentData,
) => {
  const rows = [
    {
      payment_method_name: "Efectivo",
      amount: Number(
        paymentData?.details?.efectivo || 0,
      ),
      currency: "MXN",
      exchange_rate: null,
    },
    {
      payment_method_name: "Terminal",
      amount: Number(
        paymentData?.details?.tarjeta || 0,
      ),
      currency: "MXN",
      exchange_rate: null,
    },
    {
      payment_method_name: "Dólares",
      amount: Number(
        paymentData?.details?.dolares || 0,
      ),
      currency: "USD",
      exchange_rate:
        Number(
          paymentData?.details?.exchangeRate ||
            0,
        ) || null,
    },
  ].filter((row) => row.amount > 0);

  if (rows.length === 0) {
    throw new Error(
      "El pago mixto no contiene montos válidos.",
    );
  }

  return rows;
};

export const buildPaymentsPayload = (
  paymentData,
) => {
  if (!paymentData?.method) {
    throw new Error(
      "No se detectó el método de pago.",
    );
  }

  if (paymentData.method === "Mixto") {
    return buildMixedPaymentsPayload(
      paymentData,
    );
  }

  const paymentMethodName =
    PAYMENT_METHOD_NAMES[paymentData.method];

  if (!paymentMethodName) {
    throw new Error(
      "Método de pago no válido.",
    );
  }

  const isDollarPayment =
    paymentData.method === "Dolares";

  const amount = isDollarPayment
    ? Number(
        paymentData?.details
          ?.dollarAmount || 0,
      )
    : Number(paymentData.total || 0);

  return [
    {
      payment_method_name:
        paymentMethodName,
      amount,
      currency: isDollarPayment
        ? "USD"
        : "MXN",
      exchange_rate: isDollarPayment
        ? Number(
            paymentData?.details
              ?.exchangeRate || 0,
          ) || null
        : null,
      reference:
        paymentData.method ===
        "Transferencia"
          ? paymentData?.details
              ?.trackingCode?.trim() ||
            null
          : null,
    },
  ];
};

export const buildProductsPayload = (
  products = [],
) => {
  return (products || []).map(
    (product) => {
      const hasDiscount =
        Number(
          product.descuentoMonto || 0,
        ) > 0;

      const cleanDiscountType =
        product.descuentoTipo ===
        "percent"
          ? "percent"
          : hasDiscount
            ? "amount"
            : null;

      return {
        product_id: product.id,
        quantity: Number(
          product.cantidad || 0,
        ),
        unit_price: Number(
          product.precio || 0,
        ),
        total_price: Number(
          product.importe || 0,
        ),
        original_unit_price: Number(
          product.precioOriginal ??
            product.precio ??
            0,
        ),
        final_unit_price: Number(
          product.precio || 0,
        ),
        discount_type:
          cleanDiscountType,
        discount_value: Number(
          product.descuentoValor || 0,
        ),
        discount_amount: Number(
          product.descuentoMonto || 0,
        ),
      };
    },
  );
};