/**
 * inventoryAddFormatters.js
 * Formateo de la captura de alta de inventario. Funciones puras, sin JSX ni I/O.
 */

const CURRENCY_OPTIONS = {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/**
 * Formatea un importe monetario a moneda mexicana con dos decimales fijos.
 *
 * Los decimales fijos no son cosmeticos: el CPP es un importe contable y la
 * tarjeta comparativa tiene que mostrar a simple vista el valor que se va a
 * persistir, no una aproximacion con uno o cero decimales.
 *
 * @param {unknown} amount
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  const value = Number(amount);

  if (!Number.isFinite(value)) return "$0.00";

  return new Intl.NumberFormat("es-MX", CURRENCY_OPTIONS).format(value);
};

/**
 * Formatea una cantidad de piezas con separador de miles y hasta dos decimales.
 *
 * Acepta fracciones porque el alta admite bultos parciales (una bolsa de alimento
 * abierta entra como 0.5); un entero forzado redondearia hacia abajo el stock.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const formatQuantity = (value) => {
  const quantity = Number(value);

  if (!Number.isFinite(quantity)) return "0";

  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(quantity);
};

/**
 * Variacion del CPP en moneda, con signo explicito.
 *
 * Se usa para el delta de la tarjeta comparativa: un `+$40.00` es un reprecio al
 * alza y un `-$12.50` una perdida de valor de inventario. El signo evita que el
 * lector tenga que comparar dos importes de memoria.
 *
 * @param {unknown} amount
 * @returns {string}
 */
export const formatCurrencyDelta = (amount) => {
  const value = Number(amount);

  if (!Number.isFinite(value) || value === 0) return formatCurrency(0);

  const formatted = formatCurrency(Math.abs(value));

  return `${value > 0 ? "+" : "-"}${formatted}`;
};
