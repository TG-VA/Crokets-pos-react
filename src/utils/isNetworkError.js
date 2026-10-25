const NETWORK_MESSAGE_PATTERNS = [
  "failed to fetch",
  "networkerror",
  "network request failed",
  "err_internet_disconnected",
];

const matchesNetworkMessage = (message) => {
  const normalized = String(message || "").toLowerCase();

  return NETWORK_MESSAGE_PATTERNS.some((pattern) =>
    normalized.includes(pattern)
  );
};

/**
 * Identifica fallos de red que no deben registrarse como errores de negocio.
 * Los contextos de polling los usan para mantener el ultimo conteo conocido
 * sin llenar la consola de ruido cuando el equipo pierde conexion.
 */
export const isNetworkError = (err) => {
  if (!err) return false;

  if (err instanceof TypeError || err?.name === "TypeError") {
    const message = String(err.message || "").toLowerCase();

    return /fetch/i.test(message) || matchesNetworkMessage(message);
  }

  return matchesNetworkMessage(err?.message);
};

export default isNetworkError;
