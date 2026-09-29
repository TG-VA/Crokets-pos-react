/**
 * invoiceSettingsCalculationService.js
 * Derivaciones puras del formulario de configuracion CFDI.
 *
 * Servicio puro: sin React, sin Supabase y sin I/O. Concentra la normalizacion
 * por campo, la habilitacion del boton de guardar y el mapeo entre la fila de
 * `cfdi_settings` y el estado del formulario.
 */

import {
  isValidInvoiceSeries,
  isValidIssuerName,
  isValidNextFolio,
  isValidPostalCode,
  isValidRfc,
} from "../../../services/fiscalValidationService";

export const EMPTY_SETTINGS_FORM = {
  provider: "facturama",
  environment: "sandbox",
  issuer_rfc: "",
  issuer_name: "",
  issuer_tax_regime: "",
  issuer_postal_code: "",
  invoice_series: "A",
  next_folio: 1,
  api_username: "",
  api_password: "",
  api_token: "",
  status: true,
  connection_status: "not_configured",
  last_connection_test: null,
  timbres_available: 0,
  last_timbres_sync: null,
};

/**
 * Normaliza el valor de un campo segun su tipo antes de escribirlo en el
 * estado. Los campos sin regla propia pasan sin cambios.
 */
export const normalizeSettingsField = (name, value) => {
  if (name === "issuer_rfc") {
    return value
      .replace(/[^a-zA-Z0-9&Ññ]/g, "")
      .toUpperCase()
      .slice(0, 13);
  }

  if (name === "issuer_name") {
    return value.toUpperCase().replace(/\s+/g, " ");
  }

  if (name === "issuer_postal_code") {
    return value.replace(/\D/g, "").slice(0, 5);
  }

  if (name === "invoice_series") {
    return value
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 10);
  }

  if (name === "next_folio") {
    return value.replace(/\D/g, "");
  }

  return value;
};

/**
 * Razon social del emisor con espacios colapsados.
 */
export const getNormalizedIssuerName = (issuerName) =>
  String(issuerName || "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Valida cada campo de la configuracion para saber si el formulario habilita el
 * boton de guardar. Devuelve un objeto para que la vista resalte cada input.
 */
export const getSettingsFieldValidity = (form, postalInfo, postalError) => ({
  issuerRfc: isValidRfc(form.issuer_rfc),
  issuerName: isValidIssuerName(form.issuer_name),
  postalCode: isValidPostalCode(
    form.issuer_postal_code,
    postalInfo,
    postalError
  ),
  series: isValidInvoiceSeries(form.invoice_series),
  folio: isValidNextFolio(form.next_folio),
});

/**
 * El boton de guardar exige proveedor, ambiente y los cinco campos del emisor
 * resueltos.
 */
export const isSettingsFormValid = (form, postalInfo, postalError) => {
  const validity = getSettingsFieldValidity(form, postalInfo, postalError);

  return (
    !!form.provider &&
    !!form.environment &&
    validity.issuerRfc &&
    validity.issuerName &&
    !!form.issuer_tax_regime &&
    validity.postalCode &&
    validity.series &&
    validity.folio
  );
};

/**
 * Traduce la fila de `cfdi_settings` al estado del formulario, aplicando los
 * mismos valores por defecto que la vista usaba al inicializar el estado.
 */
export const buildSettingsFormFromRow = (row) => ({
  provider: row.provider || "facturama",
  environment: row.environment || "sandbox",
  issuer_rfc: row.issuer_rfc || "",
  issuer_name: row.issuer_name || "",
  issuer_tax_regime: row.issuer_tax_regime || "",
  issuer_postal_code: row.issuer_postal_code || "",
  invoice_series: row.invoice_series || "A",
  next_folio: row.next_folio || 1,
  api_username: row.api_username || "",
  api_password: row.api_password || "",
  api_token: row.api_token || "",
  status: row.status !== false,
  connection_status: row.connection_status || "not_configured",
  last_connection_test: row.last_connection_test || null,
  timbres_available: row.timbres_available || 0,
  last_timbres_sync: row.last_timbres_sync || null,
});

/**
 * Fila de `cfdi_settings` que se persiste.
 *
 * Las credenciales del PAC se envian tal cual, sin loguear su valor: son
 * secretos y la columna se documenta en `docs/ENV_VARIABLES.md`.
 */
export const buildSettingsPayload = (form) => ({
  provider: form.provider,
  environment: form.environment,
  issuer_rfc: form.issuer_rfc.trim(),
  issuer_name: getNormalizedIssuerName(form.issuer_name),
  issuer_tax_regime: form.issuer_tax_regime,
  issuer_postal_code: form.issuer_postal_code.trim(),
  invoice_series: form.invoice_series.trim(),
  next_folio: Number(form.next_folio || 1),
  api_username: form.api_username.trim() || null,
  api_password: form.api_password.trim() || null,
  api_token: form.api_token.trim() || null,
  status: form.status,
  connection_status: form.connection_status,
  last_connection_test: form.last_connection_test,
  timbres_available: Number(form.timbres_available || 0),
  last_timbres_sync: form.last_timbres_sync,
  updated_at: new Date().toISOString(),
});

/**
 * Texto de confirmacion antes de guardar la configuracion del emisor.
 */
export const buildSettingsConfirmMessage = (form, postalInfo) =>
  `¿Deseas guardar la configuración CFDI?\n\nRFC: ${
    form.issuer_rfc
  }\nRazón social: ${getNormalizedIssuerName(form.issuer_name)}\nCP: ${
    form.issuer_postal_code
  } - ${postalInfo?.municipality}, ${postalInfo?.state}`;

/**
 * Texto de confirmacion al cambiar el ambiente a produccion.
 */
export const PRODUCTION_CONFIRM_MESSAGE =
  "Estás cambiando a PRODUCCIÓN. Las facturas emitidas tendrán validez fiscal. ¿Deseas continuar?";

/**
 * Traduce `connection_status` a la etiqueta y a la clase CSS Modules que
 * muestra la tarjeta de estado.
 */
export const getConnectionState = (connectionStatus, styles) => {
  if (connectionStatus === "connected") {
    return {
      label: "Conectado correctamente",
      className: styles.statusConnected,
    };
  }

  if (connectionStatus === "error") {
    return { label: "Error de conexión", className: styles.statusError };
  }

  return { label: "No configurado", className: styles.statusPending };
};
