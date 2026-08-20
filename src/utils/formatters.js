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
 * Formateador de fecha/hora dinámico por Sucursal
 */
export const formatDynamicDate = (isoDate, timeZone = "America/Cancun") => {
  if (!isoDate) return "N/A";

  const date = new Date(isoDate);

  return new Intl.DateTimeFormat("es-MX", {
    timeZone: timeZone, // ¡Dinámico!
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};