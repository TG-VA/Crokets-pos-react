export const sanitizeIntegerInput = (value) =>
  String(value ?? "").replace(/\D/g, "");

export const sanitizeDecimalInput = (value) => {
  const cleaned = String(value ?? "").replace(/[^\d.]/g, "");
  const [integerPart, ...rest] = cleaned.split(".");
  if (rest.length === 0) return integerPart;
  return `${integerPart}.${rest.join("").slice(0, 2)}`;
};
