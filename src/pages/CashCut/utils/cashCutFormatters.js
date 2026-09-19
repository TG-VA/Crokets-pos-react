/**
 * cashCutFormatters.js
 * Formateadores puros del modulo de Corte de cajero.
 */

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("es-MX", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
});

const cancunDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Cancun",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const fmt = (n) => currencyFormatter.format(Number(n) || 0);

export const fmtDate = (d) => dateFormatter.format(new Date(d));

export const fmtShortDate = (d) => shortDateFormatter.format(new Date(d));

export const fmtTime = (d) => timeFormatter.format(new Date(d));

export const getCancunDateValue = (date = new Date()) => {
  const parts = cancunDateFormatter.formatToParts(new Date(date));

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
};

export const getFolio = (saleId) =>
  saleId ? `#${String(saleId).slice(0, 8).toUpperCase()}` : "—";
