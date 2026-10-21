/**
 * ticketCustomizationService.js
 * Persistencia de la plantilla comercial del ticket para la sucursal activa.
 * Usa public.system_settings con setting_key 'ticket_customization' (value_type 'json').
 */

import { supabase } from "../lib/supabaseClient";

export const TICKET_CUSTOMIZATION_SETTING_KEY = "ticket_customization";

/**
 * Límites de longitud de los campos de texto de la plantilla comercial.
 * Acotan el ancho del rollo térmico (58 mm) para que el contenido no se
 * desborde al imprimir y mantienen la plantilla legible en el simulador.
 */
export const TICKET_TEMPLATE_LIMITS = Object.freeze({
  headerSlogan: 80,
  fiscalInfo: 100,
  footerLine1: 60,
  footerLine2: 60,
  footerPhone: 20,
  returnPolicy: 250,
});

const TICKET_PHONE_ALLOWED_PATTERN = /[^0-9+\s\-()]/g;

/**
 * Sanea el teléfono de atención: solo se admiten dígitos, espacios, guiones,
 * paréntesis y el prefijo `+` para cubrir formatos nacionales e internacionales.
 */
export const sanitizeTicketPhone = (value) =>
  String(value ?? "").replace(TICKET_PHONE_ALLOWED_PATTERN, "");

/**
 * Sanea un campo de la plantilla en tiempo real y lo recorta al límite
 * configurado. Los campos sin límite declarado se devuelven sin modificar.
 */
export const sanitizeTicketTemplateField = (key, value) => {
  const limit = TICKET_TEMPLATE_LIMITS[key];
  const raw = String(value ?? "");
  const sanitized = key === "footerPhone" ? sanitizeTicketPhone(raw) : raw;
  return typeof limit === "number" ? sanitized.slice(0, limit) : sanitized;
};

export const DEFAULT_TICKET_CUSTOMIZATION = Object.freeze({
  headerSlogan: "¡Todo para consentir a tu mascota!",
  fiscalInfo: "",
  footerLine1: "Gracias por su compra",
  footerLine2: "Agenda tu cita de baño",
  footerPhone: "998 117 5387",
  returnPolicy:
    "Para cambios o devoluciones presentar ticket dentro de los 7 días posteriores a su compra.",
  showCustomerPoints: true,
  showCashierName: true,
  showSaleNotes: true,
  showBranchAddress: true,
  showBranchPhone: true,
});

const SETTING_COLUMNS = `
          id,
          setting_key,
          setting_value,
          value_type,
          description,
          branch_id,
          is_active,
          created_at,
          updated_at
        `;

const TICKET_CUSTOMIZATION_CACHE_KEY = "settings_ticket_template_cache";

/**
 * La cache local se indexa por sucursal. Sin este aislamiento, un fallo de
 * Supabase podia servir la plantilla de otra sucursal en los tickets de la
 * sucursal activa.
 */
const getCacheKey = (branchId = null) =>
  `${TICKET_CUSTOMIZATION_CACHE_KEY}:${branchId ?? "global"}`;

/**
 * Normaliza una plantilla arbitraria: completa los campos ausentes con los
 * valores por defecto y recorta cada texto al límite de
 * `TICKET_TEMPLATE_LIMITS`. La sanitización es defensiva, de modo que una
 * plantilla guardada previamente, cacheada o importada desde Supabase nunca
 * pueda exceder los límites ni introducir caracteres inválidos.
 */
export const normalizeTemplate = (template = {}) => ({
  headerSlogan: sanitizeTicketTemplateField(
    "headerSlogan",
    template.headerSlogan ?? DEFAULT_TICKET_CUSTOMIZATION.headerSlogan
  ),
  fiscalInfo: sanitizeTicketTemplateField(
    "fiscalInfo",
    template.fiscalInfo ?? DEFAULT_TICKET_CUSTOMIZATION.fiscalInfo
  ),
  footerLine1: sanitizeTicketTemplateField(
    "footerLine1",
    template.footerLine1 ?? DEFAULT_TICKET_CUSTOMIZATION.footerLine1
  ),
  footerLine2: sanitizeTicketTemplateField(
    "footerLine2",
    template.footerLine2 ?? DEFAULT_TICKET_CUSTOMIZATION.footerLine2
  ),
  footerPhone: sanitizeTicketTemplateField(
    "footerPhone",
    template.footerPhone ?? DEFAULT_TICKET_CUSTOMIZATION.footerPhone
  ),
  returnPolicy: sanitizeTicketTemplateField(
    "returnPolicy",
    template.returnPolicy ?? DEFAULT_TICKET_CUSTOMIZATION.returnPolicy
  ),
  showCustomerPoints: Boolean(
    template.showCustomerPoints ??
    DEFAULT_TICKET_CUSTOMIZATION.showCustomerPoints
  ),
  showCashierName: Boolean(
    template.showCashierName ?? DEFAULT_TICKET_CUSTOMIZATION.showCashierName
  ),
  showSaleNotes: Boolean(
    template.showSaleNotes ?? DEFAULT_TICKET_CUSTOMIZATION.showSaleNotes
  ),
  showBranchAddress: Boolean(
    template.showBranchAddress ?? DEFAULT_TICKET_CUSTOMIZATION.showBranchAddress
  ),
  showBranchPhone: Boolean(
    template.showBranchPhone ?? DEFAULT_TICKET_CUSTOMIZATION.showBranchPhone
  ),
});

const readCache = (branchId = null) => {
  try {
    const raw = window.localStorage.getItem(getCacheKey(branchId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeTemplate({ ...DEFAULT_TICKET_CUSTOMIZATION, ...parsed });
  } catch (error) {
    console.error("Error leyendo caché de plantilla de ticket:", error);
    return null;
  }
};

const writeCache = (value, branchId = null) => {
  try {
    window.localStorage.setItem(
      getCacheKey(branchId),
      JSON.stringify(value || DEFAULT_TICKET_CUSTOMIZATION)
    );
    return true;
  } catch (error) {
    console.error("Error guardando caché de plantilla de ticket:", error);
    return false;
  }
};

export const getTicketCustomization = async ({ branchId } = {}) => {
  try {
    const query = supabase
      .from("system_settings")
      .select(SETTING_COLUMNS)
      .eq("setting_key", TICKET_CUSTOMIZATION_SETTING_KEY)
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (branchId) {
      query.eq("branch_id", branchId);
    } else {
      query.is("branch_id", null);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      console.error(
        "Error consultando plantilla de ticket en Supabase:",
        error
      );
      const cached = readCache(branchId);
      if (cached) return cached;
      return { ...DEFAULT_TICKET_CUSTOMIZATION };
    }

    if (!data) {
      const cached = readCache(branchId);
      if (cached) return cached;
      return { ...DEFAULT_TICKET_CUSTOMIZATION };
    }

    let parsed = { ...DEFAULT_TICKET_CUSTOMIZATION };
    try {
      if (data.setting_value) {
        const raw =
          typeof data.setting_value === "string"
            ? JSON.parse(data.setting_value)
            : data.setting_value;
        parsed = normalizeTemplate(raw);
      }
    } catch {
      parsed = { ...DEFAULT_TICKET_CUSTOMIZATION };
    }

    writeCache(parsed, branchId);
    return parsed;
  } catch (error) {
    console.error("Error al obtener plantilla de ticket:", error);
    const cached = readCache(branchId);
    if (cached) return cached;
    return { ...DEFAULT_TICKET_CUSTOMIZATION };
  }
};

export const saveTicketCustomization = async ({ branchId, template } = {}) => {
  const normalized = normalizeTemplate(template || {});
  const settingValue = JSON.stringify(normalized);

  const query = supabase
    .from("system_settings")
    .select("id")
    .eq("setting_key", TICKET_CUSTOMIZATION_SETTING_KEY)
    .eq("is_active", true);

  if (branchId) {
    query.eq("branch_id", branchId);
  } else {
    query.is("branch_id", null);
  }

  const { data: existingSetting, error: existingError } =
    await query.maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingSetting?.id) {
    const { error: updateError } = await supabase
      .from("system_settings")
      .update({
        setting_value: settingValue,
        value_type: "json",
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingSetting.id);

    if (updateError) throw updateError;
    writeCache(normalized, branchId);
    return normalized;
  }

  const { error: insertError } = await supabase.from("system_settings").insert([
    {
      id: crypto.randomUUID(),
      setting_key: TICKET_CUSTOMIZATION_SETTING_KEY,
      setting_value: settingValue,
      value_type: "json",
      description: "Plantilla de personalización del ticket de venta",
      branch_id: branchId || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  if (insertError) throw insertError;
  writeCache(normalized, branchId);
  return normalized;
};
