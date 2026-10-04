/**
 * productModifyCalculationService.js
 * Logica pura del formulario de modificacion de producto (calculos,
 * validacion y construccion de payloads). Sin I/O ni acceso a base de datos.
 */

/**
 * Calcula el margen comercial porcentual entre costo y precio de venta.
 * Manejo determinístico de costo cero y valores negativos.
 */
export const calculateGanancia = (costo, precio) => {
  const c = parseFloat(costo);
  const p = parseFloat(precio);
  if (!Number.isFinite(c) || !Number.isFinite(p) || c < 0) return 0;
  if (c === 0) return p > 0 ? 100 : 0;
  return ((p - c) / c) * 100;
};

/**
 * Redondea a 2 decimales y devuelve una cadena con formato monetario fijo.
 */
export const roundMoney = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return (Math.round(number * 100) / 100).toFixed(2);
};

/**
 * Redondea a 2 decimales y devuelve una cadena de porcentaje sin relleno.
 */
export const roundPercent = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return (Math.round(number * 100) / 100).toString();
};

/**
 * Calcula el precio con descuento a partir del precio de venta y un porcentaje.
 */
export const getDiscountPriceFromPercent = (salePrice, percent) => {
  const price = Number(salePrice);
  const discount = Number(percent);
  if (!Number.isFinite(price) || price <= 0) return "";
  if (!Number.isFinite(discount) || discount <= 0) return "";
  return roundMoney(price - price * (discount / 100));
};

/**
 * Calcula el porcentaje de descuento a partir del precio de venta y el precio rebajado.
 */
export const getDiscountPercentFromPrice = (salePrice, discountPrice) => {
  const price = Number(salePrice);
  const newPrice = Number(discountPrice);
  if (!Number.isFinite(price) || price <= 0) return "";
  if (!Number.isFinite(newPrice) || newPrice < 0) return "";
  return roundPercent(((price - newPrice) / price) * 100);
};

const toFiniteNumber = (value) =>
  value === "" || value === null || value === undefined ? NaN : Number(value);

/**
 * Valida el formulario de modificacion de producto y devuelve el diccionario
 * de errores por campo y el estado de validez global.
 */
export const validateProductModifyForm = ({
  form,
  usesInventory,
  getProductByCodigo,
  selectedProductId,
} = {}) => {
  const currentForm = form || {};
  const errors = {};

  const codigo = String(currentForm.codigo || "").trim();
  const descripcion = String(currentForm.descripcion || "").trim();
  const costo = toFiniteNumber(currentForm.costo);
  const precio = toFiniteNumber(currentForm.precio);
  const minimo = toFiniteNumber(currentForm.minimo);
  const maximo = toFiniteNumber(currentForm.maximo);
  const tax = toFiniteNumber(currentForm.tax);
  const commissionValue = toFiniteNumber(currentForm.commission_value);
  const discountPercent = toFiniteNumber(currentForm.discount_percent);
  const discountPrice = toFiniteNumber(currentForm.discount_price);

  if (!codigo) {
    errors.codigo = "El código de barras es obligatorio.";
  } else {
    const duplicate = getProductByCodigo?.(codigo);
    if (duplicate && duplicate.id !== selectedProductId) {
      errors.codigo = "Ya existe otro producto con ese código.";
    }
  }

  if (!descripcion) {
    errors.descripcion = "La descripción es obligatoria.";
  }

  if (!Number.isFinite(costo)) {
    errors.costo = "Debes capturar el precio costo global.";
  } else if (costo < 0) {
    errors.costo = "El precio costo global no puede ser menor a 0.";
  }

  if (!Number.isFinite(precio)) {
    errors.precio = "Debes capturar el precio venta global.";
  } else if (precio <= 0) {
    errors.precio = "El precio venta global debe ser mayor a 0.";
  } else if (Number.isFinite(costo) && precio < costo) {
    errors.precio =
      "El precio venta global no puede ser menor al precio costo global.";
  }

  if (!Number.isFinite(tax)) {
    errors.tax = "Debes capturar el IVA.";
  } else if (tax < 0) {
    errors.tax = "El IVA no puede ser negativo.";
  }

  if (usesInventory) {
    if (!Number.isFinite(minimo)) {
      errors.minimo = "Debes capturar el stock mínimo.";
    } else if (minimo < 0) {
      errors.minimo = "El stock mínimo no puede ser negativo.";
    }

    if (!Number.isFinite(maximo)) {
      errors.maximo = "Debes capturar el stock máximo.";
    } else if (maximo < 0) {
      errors.maximo = "El stock máximo no puede ser negativo.";
    }

    if (Number.isFinite(minimo) && Number.isFinite(maximo) && minimo > maximo) {
      errors.maximo = "El stock máximo no puede ser menor que el stock mínimo.";
    }
  }

  if (currentForm.commission_enabled) {
    if (!Number.isFinite(commissionValue)) {
      errors.commission_value = "Debes capturar el valor de la comisión.";
    } else if (commissionValue < 0) {
      errors.commission_value = "La comisión no puede ser negativa.";
    }
  }

  if (currentForm.discount_enable) {
    if (!Number.isFinite(discountPercent)) {
      errors.discount_percent = "Debes capturar el porcentaje de descuento.";
    } else if (discountPercent <= 0) {
      errors.discount_percent =
        "El descuento debe ser mayor a 0 cuando está activo.";
    } else if (discountPercent >= 100) {
      errors.discount_percent = "El descuento debe ser menor a 100%.";
    }

    if (!Number.isFinite(discountPrice)) {
      errors.discount_price = "Debes capturar el precio con descuento.";
    } else if (discountPrice <= 0) {
      errors.discount_price = "El precio con descuento debe ser mayor a 0.";
    } else if (Number.isFinite(precio) && discountPrice >= precio) {
      errors.discount_price =
        "El precio con descuento debe ser menor al precio venta global.";
    }

    if (!String(currentForm.discount_concept || "").trim()) {
      errors.discount_concept = "Debes capturar el concepto del descuento.";
    }
  }

  return {
    errors,
    isValid: Boolean(selectedProductId && Object.keys(errors).length === 0),
  };
};

/**
 * Construye el payload de actualizacion del producto.
 */
export const buildProductPayload = (form, ganancia, usesInventory) => {
  return {
    codigo: String(form.codigo || "").trim(),
    descripcion: String(form.descripcion || "").trim(),
    costo: parseFloat(form.costo) || 0,
    precio: parseFloat(form.precio) || 0,
    ganancia,
    departamento: String(form.departamento || "").trim(),
    minimo: usesInventory ? parseFloat(form.minimo) || 0 : 0,
    maximo: usesInventory ? parseFloat(form.maximo) || 0 : 0,
    use_inventory: !!usesInventory,
    sale_type: form.sale_type || "unidad",
    unit: form.unit || "pieza",
    tax: parseFloat(form.tax) || 0,
    cfdi: String(form.cfdi || "").trim(),
    status: form.status,
    isGlobal: !!form.isGlobal,
    commission_enabled: !!form.commission_enabled,
    commission_type: form.commission_type || "percent",
    commission_value: parseFloat(form.commission_value) || 0,
    commission_percent:
      form.commission_type === "percent"
        ? parseFloat(form.commission_value) || 0
        : 0,
  };
};

/**
 * Construye el payload del descuento del producto.
 */
export const buildDiscountPayload = (form) => {
  return {
    enabled: !!form.discount_enable,
    discount_percent: parseFloat(form.discount_percent) || 0,
    discount_concept: String(form.discount_concept || "").trim(),
  };
};
