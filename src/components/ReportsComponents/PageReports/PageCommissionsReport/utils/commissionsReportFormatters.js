/**
 * commissionsReportFormatters.js
 * Formateadores visuales limpios para el Reporte de Comisiones de Cajeros.
 */

export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatPercent = (value) => {
  const num = Number(value) || 0;
  return `${num.toFixed(2)}%`;
};

export const formatInteger = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatShortDate = (isoString) => {
  if (!isoString) return "---";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "---";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "---";
  }
};

export const formatDynamicDateTime = (isoString) => {
  if (!isoString) return "---";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "---";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
  } catch {
    return "---";
  }
};

export const formatDateTime = formatDynamicDateTime;

export const formatCommissionRule = (type, value) => {
  const num = Number(value) || 0;
  if (type === "percent") {
    return `${num}% por pieza`;
  }
  return `${formatCurrency(num)} por pieza`;
};
