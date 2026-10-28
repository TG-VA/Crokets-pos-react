import { calculateDifference } from "./ordersCalculationService";

export const RECEIPT_NOTE_MAX_LENGTH = 500;
export const RECEIPT_NOTE_WARNING_THRESHOLD = 450;

/**
 * Texto de la nota de recepcion sin espacios en los extremos. Acepta valores
 * nulos o no textuales sin lanzar excepciones.
 */
export const normalizeReceiptNote = (value) => (value ?? "").toString().trim();

/**
 * Estado visual del contador de caracteres. El tono cambia antes de agotar el
 * limite para que el usuario pueda corregir sin llegar al error.
 */
export const getReceiptNoteCounter = (value = "") => {
  const length = (value ?? "").toString().length;
  const tone =
    length >= RECEIPT_NOTE_MAX_LENGTH
      ? "error"
      : length >= RECEIPT_NOTE_WARNING_THRESHOLD
        ? "warning"
        : "neutral";

  return {
    length,
    maxLength: RECEIPT_NOTE_MAX_LENGTH,
    text: `${length} / ${RECEIPT_NOTE_MAX_LENGTH}`,
    tone,
  };
};

/**
 * Verdadero si al menos una partida capturada difiere de lo esperado. Las
 * partidas sin capturar no cuentan como diferencia: su validacion es
 * `isReceiptComplete`.
 */
export const hasReceiptDifferences = (items = [], quantities = {}) => {
  if (!Array.isArray(items)) return false;

  return items.some((item) => {
    const difference = calculateDifference(
      item?.expectedQty,
      quantities?.[item?.productId]
    );

    return difference !== null && difference !== 0;
  });
};

/**
 * Regla unica de la nota de recepcion. Retorna el mensaje de error o cadena
 * vacia si la nota es valida. Se usa en el hook, en el servicio y se replica
 * en `receive_store_order` para no confiar solo en el cliente.
 */
export const validateReceiptNote = ({
  items = [],
  quantities = {},
  note = "",
} = {}) => {
  const normalized = normalizeReceiptNote(note);

  if (normalized.length > RECEIPT_NOTE_MAX_LENGTH) {
    return `La nota de recepción no puede exceder ${RECEIPT_NOTE_MAX_LENGTH} caracteres.`;
  }

  if (hasReceiptDifferences(items, quantities) && !normalized) {
    return "La nota de recepción es obligatoria cuando hay diferencias en el conteo.";
  }

  return "";
};
