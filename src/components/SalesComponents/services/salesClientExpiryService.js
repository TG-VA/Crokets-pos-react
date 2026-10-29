export const SALE_CLIENT_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Devuelve los milisegundos que le quedan a la asignacion del cliente.
 * Un valor menor o igual a cero significa que la asignacion ya expiro.
 */
export const getClientExpiryRemainingMs = (
  assignedAt,
  now = Date.now(),
  expiryMs = SALE_CLIENT_EXPIRY_MS
) => {
  const assigned = Number(assignedAt);
  if (!Number.isFinite(assigned) || assigned <= 0) return 0;

  return Math.max(assigned + expiryMs - Number(now), 0);
};

/**
 * Funcion pura de expiracion: recibe el instante de asignacion y el instante
 * actual para poder probarse con temporizadores falsos sin depender de relojes.
 */
export const isSaleClientExpired = (
  assignedAt,
  now = Date.now(),
  expiryMs = SALE_CLIENT_EXPIRY_MS
) => {
  const assigned = Number(assignedAt);
  if (!Number.isFinite(assigned) || assigned <= 0) return false;

  return Number(now) - assigned >= expiryMs;
};
