/**
 * invoiceSettingsFormatters.js
 * Presentacion de la configuracion CFDI.
 *
 * Funciones puras: sin React y sin Supabase. Separate del modulo CSS y del JSX
 * para que ambas secciones de estado compartan el mismo formato de fecha.
 */

/**
 * Fecha de las tarjetas de estado, en el huso de Cancun que usa la pantalla.
 * Devuelve "Nunca" cuando aun no hay registro.
 */
export const formatSettingsDateTime = (value) => {
  if (!value) return "Nunca";

  return new Date(value).toLocaleString("es-MX", {
    timeZone: "America/Cancun",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Etiqueta del ambiente en el pie de la pantalla.
 */
export const getSettingsEnvironmentLabel = (environment) =>
  environment === "production" ? "Producción" : "Sandbox / Pruebas";
