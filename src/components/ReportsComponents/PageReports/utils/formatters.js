/**
 * Formateador de moneda nativo en formato MXN ($)
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount || 0);
};

/**
 * Formateador de números con separador de miles
 */
export const formatNumber = (value) => {
  return new Intl.NumberFormat("es-MX").format(value || 0);
};

/**
 * Formateador de fecha/hora de última actualización
 */
export const formatLastUpdate = (isoDate) => {
  if (!isoDate) return "N/A";
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};