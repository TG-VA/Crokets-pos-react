/**
 * Sanitiza una cantidad capturada en los formularios de pedidos.
 * El inventario solo admite unidades enteras, por lo que se conserva
 * unicamente la parte entera del valor capturado.
 */
export const sanitizeIntegerQuantity = (value) => {
  const raw = String(value ?? "").replace(/[^\d.,]/g, "");
  const integerPart = raw.split(/[.,]/)[0] ?? "";
  const digits = integerPart.replace(/\D/g, "");

  if (!digits) return "";

  return digits.replace(/^0+(?=\d)/, "");
};
