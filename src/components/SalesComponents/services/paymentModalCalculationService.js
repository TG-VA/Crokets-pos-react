const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Redondeo monetario a centavos. Se usa el mismo criterio que el resto del
 * cobro (`toFixed(2)` sobre el total), de modo que la UI y el monto persistido
 * coinciden al centavo.
 */
export const roundCurrency = (value) => {
  const parsed = toNumber(value);
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
};

/**
 * Redondeo hacia arriba a centavos. Para los adeudos en dolares garantiza que
 * el monto mostrado siempre cubra el total en MXN, sin dejar un faltante de
 * fracciones de centavo.
 */
export const ceilCurrency = (value) => {
  const parsed = toNumber(value);
  return Math.ceil(Number((parsed * 100).toFixed(6))) / 100;
};

export const isValidExchangeRate = (exchangeRate) => toNumber(exchangeRate) > 0;

/**
 * Dolares exactos que faltan para cubrir un total en MXN.
 * Devuelve 0 cuando el total o el tipo de cambio no son validos.
 */
export const getDollarsDueInUsd = (totalMxn, exchangeRate) => {
  const total = roundCurrency(totalMxn);
  const rate = toNumber(exchangeRate);

  if (total <= 0 || rate <= 0) return 0;

  return ceilCurrency(total / rate);
};

/**
 * Dolares que faltan en un pago mixto, descontando lo ya cubierto en MXN
 * (efectivo y tarjeta). Los dolares capturados no se descuentan porque esta
 * cifra es justamente el adeudo pendiente en USD.
 */
export const getMixedRemainingUsd = ({
  totalMxn,
  cashMxn = 0,
  cardMxn = 0,
  exchangeRate,
}) => {
  const total = roundCurrency(totalMxn);
  const paidMxn = roundCurrency(toNumber(cashMxn) + toNumber(cardMxn));
  const remainingMxn = roundCurrency(Math.max(total - paidMxn, 0));

  if (remainingMxn <= 0) return 0;

  return getDollarsDueInUsd(remainingMxn, exchangeRate);
};

/**
 * Total pagado convertido a MXN segun el metodo seleccionado. Mantiene el mismo
 * redondeo que `getDollarsDueInUsd` para que la validacion de cobertura no
 * rechace pagos exactos por diferencias de punto flotante.
 */
export const getPaymentTotalInMxn = ({
  method,
  amount = 0,
  exchangeRate = 0,
  mixed = {},
}) => {
  const rate = toNumber(exchangeRate);

  switch (method) {
    case "Efectivo":
      return roundCurrency(amount);
    case "Dolares":
      return roundCurrency(toNumber(amount) * rate);
    case "Mixto":
      return roundCurrency(
        toNumber(mixed.efectivo) +
          toNumber(mixed.tarjeta) +
          toNumber(mixed.dolares) * rate
      );
    default:
      return 0;
  }
};
