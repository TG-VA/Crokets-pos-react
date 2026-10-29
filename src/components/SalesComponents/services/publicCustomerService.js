export const PUBLIC_CUSTOMER_NAME = "PÚBLICO EN GENERAL";

const normalizeName = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();

/**
 * Indica si el nombre corresponde a un cliente con nombre propio, es decir,
 * distinto de vacio y del cliente generico "PÚBLICO EN GENERAL".
 */
export const isNamedCustomer = (name) => {
  const normalized = normalizeName(name);

  return (
    normalized !== "" && normalized !== normalizeName(PUBLIC_CUSTOMER_NAME)
  );
};
