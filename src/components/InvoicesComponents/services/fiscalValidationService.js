/**
 * fiscalValidationService.js
 * Validaciones y normalizaciones fiscales del SAT, compartidas por el modal de
 * datos fiscales y por la configuracion CFDI.
 *
 * Servicio puro: sin React, sin Supabase y sin I/O. Todas las reglas de RFC,
 * codigo postal, correo y series viven aqui para que las dos pantallas que las
 * usan no las implementen dos veces con criterios distintos.
 */

const RFC_REGEX = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;

/**
 * RFC de persona fisica (13) o moral (12): 3 o 4 letras, 6 de fecha y 3 de
 * homoclave.
 */
export const isValidRfc = (value) => RFC_REGEX.test(String(value || ""));

/**
 * Solo digitos. Se usa para telefonos y codigos postales.
 */
export const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

/**
 * RFC en mayusculas sin espacios ni caracteres ajenos al catalogo.
 */
export const normalizeRfc = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9Ñ&]/g, "");

/**
 * Correo en minusculas sin espacios, como lo requiere el CFDI.
 */
export const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s/g, "");

/**
 * Texto en mayusculas con espacios colapsados, para razon social y direccion.
 */
export const normalizeUpperText = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/\s+/g, " ");

/**
 * Correo con la forma minima que acepta el catalogo fiscal.
 */
export const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));

/**
 * El C.P. fiscal solo es valido si tiene cinco digitos, existe en el catalogo
 * SEPOMEX y la consulta no fallo.
 */
export const isValidPostalCode = (postalCode, postalInfo, postalError) =>
  /^\d{5}$/.test(String(postalCode || "")) && !!postalInfo && !postalError;

/**
 * Razon social del emisor: entre 3 y 255 caracteres, con espacios colapsados.
 */
export const isValidIssuerName = (value) => {
  const normalized = normalizeUpperText(value).trim();

  return normalized.length >= 3 && normalized.length <= 255;
};

/**
 * Serie de facturacion: solo letras y numeros, maximo 10 caracteres.
 */
export const isValidInvoiceSeries = (value) => {
  const series = String(value || "");

  return /^[A-Z0-9]+$/.test(series) && series.length <= 10;
};

/**
 * Proximo folio: tiene que ser un entero mayor a cero.
 */
export const isValidNextFolio = (value) => Number(value) > 0;

/**
 * Telefono de diez digitos, sin consideraciones de prefijo de pais.
 */
export const isValidPhone = (value) => onlyDigits(value).length === 10;

/**
 * Valida el formulario fiscal del cliente y devuelve el primer mensaje de
 * error, o cadena vacia cuando el formulario es correcto. El orden es el que
 * ve el usuario: campo por campo, de arriba abajo.
 */
export const validateFiscalCustomerForm = (form, postalInfo, postalError) => {
  if (!isValidPhone(form.phone)) {
    return "El teléfono debe tener 10 dígitos.";
  }

  if (!isValidEmail(form.fiscal_email)) {
    return "Ingresa un correo fiscal válido.";
  }

  if (!isValidRfc(form.rfc)) {
    return "Ingresa un RFC válido.";
  }

  if (!String(form.razon_social || "").trim()) {
    return "La razón social es obligatoria.";
  }

  if (onlyDigits(form.postal_code).length !== 5) {
    return "El código postal fiscal debe tener 5 dígitos.";
  }

  if (!isValidPostalCode(form.postal_code, postalInfo, postalError)) {
    return "El código postal fiscal no existe en el catálogo SEPOMEX.";
  }

  if (!form.tax_regime) return "Selecciona el régimen fiscal.";
  if (!form.cfdi_use) return "Selecciona el uso CFDI.";

  return "";
};

/**
 * Valida el formulario de configuracion del emisor. A diferencia del cliente,
 * el C.P. se valida en dos pasos: primero el formato de cinco digitos y despues
 * la existencia en el catalogo, para que el mensaje sea preciso.
 */
export const validateInvoiceSettingsForm = ({
  issuerRfc,
  issuerName,
  issuerTaxRegime,
  issuerPostalCode,
  invoiceSeries,
  nextFolio,
  postalInfo,
}) => {
  if (!isValidRfc(issuerRfc))
    return "El RFC emisor no tiene un formato válido.";

  if (!isValidIssuerName(issuerName)) {
    return "La razón social debe tener entre 3 y 255 caracteres.";
  }

  if (!issuerTaxRegime) return "Selecciona el régimen fiscal emisor.";

  if (!/^\d{5}$/.test(String(issuerPostalCode || ""))) {
    return "El código postal fiscal debe tener 5 dígitos.";
  }

  if (!postalInfo) {
    return "El código postal fiscal no existe en el catálogo SEPOMEX.";
  }

  if (!isValidInvoiceSeries(invoiceSeries)) {
    return "La serie debe contener solo letras y números, máximo 10 caracteres.";
  }

  if (!isValidNextFolio(nextFolio))
    return "El próximo folio debe ser mayor a 0.";

  return "";
};

/**
 * Marca de cada campo del formulario fiscal: vacio, `valid` o `invalid`.
 * Un campo en blanco no se marca, para no ensuciar el formulario antes de que
 * el usuario escriba.
 */
export const getFiscalFieldStatus = (form, postalInfo, postalError) => ({
  phone:
    form.phone.length === 0
      ? ""
      : isValidPhone(form.phone)
        ? "valid"
        : "invalid",

  fiscal_email:
    form.fiscal_email.length === 0
      ? ""
      : isValidEmail(form.fiscal_email)
        ? "valid"
        : "invalid",

  rfc: form.rfc.length === 0 ? "" : isValidRfc(form.rfc) ? "valid" : "invalid",

  razon_social: form.razon_social.trim().length === 0 ? "" : "valid",

  postal_code:
    form.postal_code.length === 0
      ? ""
      : isValidPostalCode(form.postal_code, postalInfo, postalError)
        ? "valid"
        : "invalid",

  tax_regime: form.tax_regime ? "valid" : "",

  cfdi_use: form.cfdi_use ? "valid" : "",
});

/**
 * El boton de guardar se habilita solo con los siete campos obligatorios
 * resueltos, lo que replica la condicion del boton antes del refactor.
 */
export const isFiscalCustomerFormValid = (form, postalInfo, postalError) =>
  isValidPhone(form.phone) &&
  isValidEmail(form.fiscal_email) &&
  isValidRfc(form.rfc) &&
  form.razon_social.trim().length > 0 &&
  isValidPostalCode(form.postal_code, postalInfo, postalError) &&
  !!form.tax_regime &&
  !!form.cfdi_use;
