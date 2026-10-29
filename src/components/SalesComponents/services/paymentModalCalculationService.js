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
 * Redondeo hacia arriba a dolares enteros. Los adeudos en dolares se muestran
 * sin decimales y siempre cubren el total en MXN (19.29 USD se cobra como 20),
 * aunque haya que dar cambio. El `toFixed(6)` evita subir un dolar por ruido
 * de punto flotante.
 */
export const ceilWholeDollars = (value) => {
  const parsed = toNumber(value);
  return Math.ceil(Number(parsed.toFixed(6)));
};

export const isValidExchangeRate = (exchangeRate) => toNumber(exchangeRate) > 0;

/**
 * Dolares enteros que faltan para cubrir un total en MXN, redondeados hacia
 * arriba. Devuelve 0 cuando el total o el tipo de cambio no son validos.
 */
export const getDollarsDueInUsd = (totalMxn, exchangeRate) => {
  const total = roundCurrency(totalMxn);
  const rate = toNumber(exchangeRate);

  if (total <= 0 || rate <= 0) return 0;

  return ceilWholeDollars(total / rate);
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
 * Total pagado convertido a MXN segun el metodo seleccionado. Redondea a
 * centavos para que la validacion de cobertura no rechace pagos exactos por
 * diferencias de punto flotante.
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
