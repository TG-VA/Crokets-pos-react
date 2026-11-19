// Normaliza lo tecleado en la diferencia del ajuste: solo digitos y un signo
// negativo inicial opcional. Un "-" solo se conserva para permitir escribirlo.
export const normalizeAdjustmentQuantityInput = (value) => {
  const rawValue = String(value ?? "");

  if (!rawValue) return "";

  const normalizedValue = rawValue.replace(/[^\d-]/g, "");
  const hasNegativeSign = normalizedValue.startsWith("-");
  const digitsOnly = normalizedValue.replace(/-/g, "");

  if (!digitsOnly) return hasNegativeSign ? "-" : "";

  return `${hasNegativeSign ? "-" : ""}${digitsOnly}`;
};

// Convierte la diferencia capturada a entero; vacio, "-" o invalido valen 0.
export const parseAdjustmentQuantity = (value) => {
  const rawValue = String(value ?? "").trim();

  if (!rawValue || rawValue === "-") return 0;

  const quantity = Number.parseInt(rawValue, 10);

  return Number.isFinite(quantity) ? quantity : 0;
};
