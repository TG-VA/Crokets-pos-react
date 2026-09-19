/**
 * rewardModalCalculationService.js
 * Logica pura del modal de recompensas (normalizacion, validacion, payloads).
 * Sin I/O ni acceso a base de datos.
 */

export const NAME_MAX_LENGTH = 80;
export const DESCRIPTION_MAX_LENGTH = 250;
export const POINTS_MAX_VALUE = 999999;
export const QUANTITY_MAX_VALUE = 999;
export const FIXED_DISCOUNT_MAX_VALUE = 99999;
export const POINTS_MAX_LENGTH = 6;
export const QUANTITY_MAX_LENGTH = 3;
export const DISCOUNT_VALUE_MAX_LENGTH = 8;

export const EMPTY_REWARD_FORM = Object.freeze({
  name: "",
  description: "",
  points_required: "",
  is_active: true,
  reward_type: "free_product",
  reward_quantity: "1",
  discount_type: "",
  discount_value: "",
});

export const REWARD_TYPES = Object.freeze({
  free_product: "Producto gratis",
  product_discount: "Descuento en producto",
});

export const DISCOUNT_TYPES = Object.freeze({
  percent: "Porcentaje",
  fixed: "Monto fijo",
});

export const MIN_PRODUCT_SEARCH_LENGTH = 2;

export const REWARD_TOUCHED_FIELDS = Object.freeze({
  name: true,
  description: true,
  points_required: true,
  reward_type: true,
  reward_quantity: true,
  discount_type: true,
  discount_value: true,
  products: true,
});

/**
 * Normaliza el tipo de recompensa a un valor soportado.
 */
export const normalizeRewardType = (type) => {
  return type === "product_discount" ? "product_discount" : "free_product";
};

/**
 * Colapsa espacios, convierte a mayusculas y recorta a maxLength.
 */
export const normalizeUpperText = (value, maxLength = null) => {
  const normalizedValue = String(value || "")
    .replace(/\s+/g, " ")
    .toUpperCase();

  return maxLength ? normalizedValue.slice(0, maxLength) : normalizedValue;
};

/**
 * Deja solo digitos y limita a 6 caracteres (puntos requeridos).
 */
export const normalizePoints = (value) => {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, POINTS_MAX_LENGTH);
};

/**
 * Deja solo digitos y limita a 3 caracteres (cantidad de unidades).
 */
export const normalizeQuantity = (value) => {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, QUANTITY_MAX_LENGTH);
};

/**
 * Permite un unico separador decimal con hasta 2 decimales.
 */
export const normalizeDiscountValue = (value) => {
  const cleanValue = String(value || "")
    .replace(/[^\d.]/g, "")
    .replace(/^0+(?=\d)/, "");

  const parts = cleanValue.split(".");

  if (parts.length > 1) {
    return `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`.slice(
      0,
      DISCOUNT_VALUE_MAX_LENGTH
    );
  }

  return parts[0].slice(0, DISCOUNT_VALUE_MAX_LENGTH);
};

const FIELD_NORMALIZERS = {
  name: (value) => normalizeUpperText(value, NAME_MAX_LENGTH),
  description: (value) => normalizeUpperText(value, DESCRIPTION_MAX_LENGTH),
  points_required: normalizePoints,
  reward_quantity: normalizeQuantity,
  discount_value: normalizeDiscountValue,
};

/**
 * Aplica la normalizacion correspondiente al campo (o deja el valor tal cual).
 */
export const normalizeRewardFieldValue = (field, value) => {
  const normalizer = FIELD_NORMALIZERS[field];
  return normalizer ? normalizer(value) : value;
};

/**
 * Valida el formulario y devuelve un mapa de errores por campo.
 */
export const validateRewardValues = (values, selectedIds = []) => {
  const errors = {};

  const cleanName = String(values.name || "").trim();
  const cleanDescription = String(values.description || "").trim();
  const points = Number(values.points_required || 0);
  const rewardQuantity = Number(values.reward_quantity || 0);
  const discountValue = Number(values.discount_value || 0);

  if (!cleanName) {
    errors.name = "Ingresa el nombre de la recompensa.";
  } else if (cleanName.length < 3) {
    errors.name = "El nombre debe tener al menos 3 caracteres.";
  } else if (cleanName.length > NAME_MAX_LENGTH) {
    errors.name = `El nombre no puede superar ${NAME_MAX_LENGTH} caracteres.`;
  }

  if (cleanDescription.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `La descripción no puede superar ${DESCRIPTION_MAX_LENGTH} caracteres.`;
  }

  if (!String(values.points_required || "").trim()) {
    errors.points_required = "Ingresa los puntos requeridos.";
  } else if (!Number.isInteger(points) || points <= 0) {
    errors.points_required = "Los puntos deben ser mayores a 0.";
  } else if (points > POINTS_MAX_VALUE) {
    errors.points_required = `Los puntos no pueden superar ${POINTS_MAX_VALUE}.`;
  }

  if (!values.reward_type || !REWARD_TYPES[values.reward_type]) {
    errors.reward_type = "Selecciona un tipo de recompensa válido.";
  }

  if (!String(values.reward_quantity || "").trim()) {
    errors.reward_quantity = "Ingresa la cantidad permitida.";
  } else if (!Number.isInteger(rewardQuantity) || rewardQuantity <= 0) {
    errors.reward_quantity = "La cantidad debe ser mayor a 0.";
  } else if (rewardQuantity > QUANTITY_MAX_VALUE) {
    errors.reward_quantity = `La cantidad no puede superar ${QUANTITY_MAX_VALUE}.`;
  }

  if (values.reward_type === "free_product" && !selectedIds.length) {
    errors.products = "Selecciona al menos un producto aplicable.";
  }

  if (values.reward_type === "product_discount") {
    if (!values.discount_type || !DISCOUNT_TYPES[values.discount_type]) {
      errors.discount_type = "Selecciona el tipo de descuento.";
    }

    if (!String(values.discount_value || "").trim()) {
      errors.discount_value = "Ingresa el valor del descuento.";
    } else if (!discountValue || discountValue <= 0) {
      errors.discount_value = "El descuento debe ser mayor a 0.";
    } else if (
      values.discount_type === "percent" &&
      (discountValue <= 0 || discountValue > 100)
    ) {
      errors.discount_value = "El porcentaje debe estar entre 1 y 100.";
    } else if (
      values.discount_type === "fixed" &&
      discountValue > FIXED_DISCOUNT_MAX_VALUE
    ) {
      errors.discount_value = `El descuento fijo no puede superar $${FIXED_DISCOUNT_MAX_VALUE}.`;
    }
  }

  return errors;
};

/**
 * Construye el formulario a partir de una recompensa existente (o el vacio).
 */
export const buildRewardFormValues = (rewardToEdit) => {
  if (!rewardToEdit) {
    return { ...EMPTY_REWARD_FORM };
  }

  const normalizedRewardType = normalizeRewardType(rewardToEdit.reward_type);
  const isDiscountReward = normalizedRewardType === "product_discount";

  return {
    name: String(rewardToEdit.name || "").slice(0, NAME_MAX_LENGTH),
    description: String(rewardToEdit.description || "").slice(
      0,
      DESCRIPTION_MAX_LENGTH
    ),
    points_required: String(rewardToEdit.points_required || ""),
    is_active: rewardToEdit.is_active !== false,
    reward_type: normalizedRewardType,
    reward_quantity: String(rewardToEdit.reward_quantity || 1),
    discount_type: isDiscountReward
      ? rewardToEdit.discount_type || "percent"
      : "",
    discount_value:
      isDiscountReward &&
      rewardToEdit.discount_value !== null &&
      rewardToEdit.discount_value !== undefined
        ? String(rewardToEdit.discount_value)
        : "",
  };
};

/**
 * Calcula el siguiente formulario y si debe cargar productos al cambiar el tipo.
 */
export const buildRewardTypeChange = (formData, value) => {
  const nextRewardType = normalizeRewardType(value);
  const isDiscountReward = nextRewardType === "product_discount";

  return {
    needsProducts: nextRewardType === "free_product",
    values: {
      ...formData,
      reward_type: nextRewardType,
      reward_quantity: formData.reward_quantity || "1",
      discount_type: isDiscountReward
        ? formData.discount_type || "percent"
        : "",
      discount_value: isDiscountReward ? formData.discount_value : "",
    },
  };
};

/**
 * Determina si el formulario puede enviarse.
 */
export const canSubmitReward = ({ formData, errors, saving }) => {
  return (
    String(formData.name || "").trim().length >= 3 &&
    Number(formData.points_required || 0) > 0 &&
    Object.keys(errors || {}).length === 0 &&
    !saving
  );
};

/**
 * Normaliza los valores del formulario antes de validar/persistir.
 */
export const buildNormalizedRewardData = (formData, requiresDiscount) => {
  return {
    name: normalizeUpperText(formData.name, NAME_MAX_LENGTH).trim(),
    description: normalizeUpperText(
      formData.description,
      DESCRIPTION_MAX_LENGTH
    ).trim(),
    points_required: Number(formData.points_required || 0),
    is_active: formData.is_active,
    reward_type: normalizeRewardType(formData.reward_type),
    reward_quantity: Number(formData.reward_quantity || 1),
    discount_type: requiresDiscount ? formData.discount_type || null : null,
    discount_value: requiresDiscount
      ? Number(formData.discount_value || 0)
      : null,
  };
};

/**
 * Construye el payload de la tabla `rewards` (sin id ni created_at).
 */
export const buildRewardPayload = (
  normalizedData,
  timestamp = new Date().toISOString()
) => {
  return {
    name: normalizedData.name,
    description: normalizedData.description || null,
    points_required: normalizedData.points_required,
    is_active: normalizedData.is_active,
    reward_type: normalizedData.reward_type,
    reward_quantity: normalizedData.reward_quantity,
    discount_type: normalizedData.discount_type,
    discount_value: normalizedData.discount_value,
    updated_at: timestamp,
  };
};

/**
 * Diff entre los productos vinculados actuales y los seleccionados.
 */
export const diffRewardProductIds = (
  currentProductIds = [],
  selectedProductIds = []
) => {
  return {
    productIdsToInsert: selectedProductIds.filter(
      (productId) => !currentProductIds.includes(productId)
    ),
    productIdsToDelete: currentProductIds.filter(
      (productId) => !selectedProductIds.includes(productId)
    ),
  };
};

/**
 * Alterna un producto en la seleccion.
 */
export const toggleRewardProductId = (selectedProductIds = [], productId) => {
  return selectedProductIds.includes(productId)
    ? selectedProductIds.filter((id) => id !== productId)
    : [...selectedProductIds, productId];
};

/**
 * Productos seleccionados, respetando el orden del catalogo.
 */
export const getSelectedRewardProducts = (
  products = [],
  selectedProductIds = []
) => {
  return products.filter((product) => selectedProductIds.includes(product.id));
};

/**
 * Filtra el catalogo por busqueda (minimo 2 caracteres), excluyendo seleccionados.
 */
export const getFilteredRewardProducts = ({
  products = [],
  searchTerm = "",
  selectedProductIds = [],
}) => {
  const search = String(searchTerm || "")
    .trim()
    .toLowerCase();

  if (search.length < MIN_PRODUCT_SEARCH_LENGTH) {
    return [];
  }

  return products.filter((product) => {
    if (selectedProductIds.includes(product.id)) return false;

    const values = [product.name, product.barcode, product.sale_price];

    return values.some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(search)
    );
  });
};

/**
 * Estado visual de un campo: "" | "valid" | "invalid".
 */
export const getRewardFieldState = ({
  field,
  touchedFields,
  fieldErrors,
  formData,
}) => {
  if (!touchedFields[field]) return "";

  if (fieldErrors[field]) return "invalid";

  const value = String(formData[field] ?? "").trim();

  return value ? "valid" : "";
};
