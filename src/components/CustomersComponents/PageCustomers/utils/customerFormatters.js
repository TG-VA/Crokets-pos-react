/**
 * customerFormatters.js
 * Normalizaciones y ordenamientos compartidos por las pantallas de Clientes.
 *
 * Estas funciones son puras: no hacen I/O ni dependen de React o Supabase.
 * Viven a nivel de modulo (no dentro de una vista) porque las consumen mas de
 * una pantalla: el ordenamiento de clientes por nombre se usa tanto en
 * `RewardsAvailability` como en `PointsAdjustment`, y la normalizacion de
 * telefono tanto en `CustomersList` como en `CustomerModal`.
 */

/**
 * Nombre legible de un cliente, con respaldo encadenado y sin espacios finales.
 */
export const getCustomerSortName = (customer) => {
  return String(
    customer?.name || customer?.phone || customer?.email || "SIN NOMBRE"
  ).trim();
};

/**
 * Ordena una copia de la lista por nombre de cliente (locale es, sin distinguir
 * mayusculas y con ordenacion numerica natural).
 */
export const sortCustomersByName = (customersList = []) => {
  return [...customersList].sort((a, b) => {
    return getCustomerSortName(a).localeCompare(getCustomerSortName(b), "es", {
      sensitivity: "base",
      numeric: true,
    });
  });
};

/**
 * Deja solo digitos y recorta a 10 (longitud de un telefono mexicano).
 */
export const normalizePhoneDigits = (value) => {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);
};

/**
 * Colapsa espacios internos, recorta y pasa a mayusculas. Se usa para mostrar y
 * comparar textos de auditoria (motivos, sucursales, usuarios).
 */
export const normalizeText = (value) => {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
};
