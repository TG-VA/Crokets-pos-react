/**
 * fiscalCustomerCalculationService.js
 * Ensamblado de payloads y derivaciones puras del modal de datos fiscales.
 *
 * Servicio puro: sin React, sin Supabase y sin I/O. Decide que columnas se
 * escriben en `customers` y con que valores normalizados, de modo que el hook
 * no tenga que conocer la forma de la tabla.
 */

import {
  normalizeEmail,
  normalizeRfc,
  normalizeUpperText,
  onlyDigits,
} from "../../../services/fiscalValidationService";

export const EMPTY_FISCAL_FORM = {
  customerId: "",
  phone: "",
  fiscal_email: "",
  rfc: "",
  razon_social: "",
  postal_code: "",
  tax_regime: "",
  cfdi_use: "",
  address: "",
};

/**
 * Campos que se marcan como tocados cuando la validacion falla, para que la
 * vista muestre de una vez todos los errores del formulario.
 */
export const ALL_FISCAL_FIELDS_TOUCHED = {
  phone: true,
  fiscal_email: true,
  rfc: true,
  razon_social: true,
  postal_code: true,
  tax_regime: true,
  cfdi_use: true,
};

/**
 * Traduce un cliente existente al formulario fiscal, con los limites de captura
 * que aplica la vista (10 digitos de telefono, 13 de RFC, 5 de C.P.).
 *
 * `fallbackEmail` permite que un cliente sin correo fiscal tome el correo
 * comercial, que es lo que ocurre al seleccionar un cliente de puntos.
 */
export const buildFiscalFormFromCustomer = (
  customer,
  { fallbackEmail } = {}
) => {
  const postalCode = onlyDigits(customer.postal_code).slice(0, 5);

  return {
    customerId: customer.id || "",
    phone: onlyDigits(customer.phone).slice(0, 10),
    fiscal_email: normalizeEmail(customer.fiscal_email || fallbackEmail || ""),
    rfc: normalizeRfc(customer.rfc).slice(0, 13),
    razon_social: normalizeUpperText(customer.razon_social),
    postal_code: postalCode,
    tax_regime: customer.tax_regime || "",
    cfdi_use: customer.cfdi_use || "",
    address: customer.address || "",
  };
};

/**
 * Campos del formulario ya normalizados para confirmar y persistir.
 */
export const buildNormalizedFiscalValues = (form) => ({
  razonSocial: normalizeUpperText(form.razon_social).trim(),
  fiscalEmail: normalizeEmail(form.fiscal_email),
  phone: onlyDigits(form.phone),
  postalCode: onlyDigits(form.postal_code),
  rfc: normalizeRfc(form.rfc),
});

/**
 * Fila de `customers` que se escribe al guardar los datos fiscales.
 *
 * El nombre comercial se anula a proposito: en el CFDI la denominacion es la
 * razon social, y el catalogo de clientes se ordena por `name`.
 */
export const buildFiscalCustomerPayload = (values, form) => ({
  name: null,
  phone: values.phone,
  email: values.fiscalEmail,
  fiscal_email: values.fiscalEmail,
  rfc: values.rfc,
  razon_social: values.razonSocial,
  postal_code: values.postalCode,
  tax_regime: form.tax_regime,
  cfdi_use: form.cfdi_use,
  address: form.address.trim() || null,
  is_billing_customer: true,
  status: true,
  updated_at: new Date().toISOString(),
});

/**
 * Texto de confirmacion antes de escribir, con los datos ya normalizados.
 */
export const buildFiscalConfirmMessage = (values, postalInfo) =>
  `¿Deseas guardar estos datos fiscales?\n\nRFC: ${values.rfc}\nRazón social: ${
    values.razonSocial
  }\nCP: ${values.postalCode} - ${postalInfo?.municipality}, ${
    postalInfo?.state
  }`;
