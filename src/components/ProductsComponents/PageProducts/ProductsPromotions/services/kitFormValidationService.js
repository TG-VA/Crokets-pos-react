import { validateKitDateRange } from "./kitValidityCalculationService";

const MAX_KITS_MESSAGE =
  "El límite de venta por transacción debe ser un número entero mayor o igual a 1.";

const isPositiveNumber = (value) =>
  Number.isFinite(Number(value)) && Number(value) > 0;

/**
 * Valida el formulario del kit. Devuelve el primer error como
 * `{ title, message }` o `null` si es valido.
 */
export const validateKitForm = (form, selectedProducts) => {
  if (!form.barcode.trim()) {
    return {
      title: "Código requerido",
      message: "Captura el código de barras del kit.",
    };
  }
  if (!form.description.trim()) {
    return {
      title: "Descripción requerida",
      message: "Captura la descripción del kit.",
    };
  }
  if (!isPositiveNumber(form.price)) {
    return {
      title: "Precio requerido",
      message: "Captura un precio válido para el kit.",
    };
  }
  const maxKits = Number(form.max_kits_per_sale);
  if (!Number.isInteger(maxKits) || maxKits < 1) {
    return { title: "Límite inválido", message: MAX_KITS_MESSAGE };
  }
  if (
    (!form.starts_on && !form.no_starts_on) ||
    (!form.ends_on && !form.no_ends_on)
  ) {
    return {
      title: "Vigencia requerida",
      message:
        'Captura las fechas de vigencia o marca "Sin fecha límite" en las que no apliquen.',
    };
  }
  const dateRangeError = validateKitDateRange(form.starts_on, form.ends_on);
  if (dateRangeError) {
    return { title: "Vigencia inválida", message: dateRangeError };
  }
  if (selectedProducts.length === 0) {
    return {
      title: "Productos requeridos",
      message: "Agrega al menos un producto al kit.",
    };
  }
  if (selectedProducts.some((p) => !isPositiveNumber(p.quantity))) {
    return {
      title: "Cantidad inválida",
      message: "Todos los productos del kit deben tener cantidad mayor a 0.",
    };
  }
  return null;
};
