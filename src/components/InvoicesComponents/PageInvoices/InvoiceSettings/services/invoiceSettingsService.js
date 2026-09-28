/**
 * invoiceSettingsService.js
 * Lectura y escritura de la configuracion del emisor en `cfdi_settings`.
 *
 * Solo este archivo conoce el cliente de Supabase y la forma de la tabla
 * `cfdi_settings` (DIP, AGENTS.md).
 */

import { supabase } from "../../../../../lib/supabaseClient";

/**
 * Configuracion activa del emisor. Se toma la mas reciente: la tabla admite
 * historico, pero la pantalla solo edita la vigente.
 */
export const fetchActiveCfdiSettings = async () => {
  const { data, error } = await supabase
    .from("cfdi_settings")
    .select("*")
    .eq("status", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data || null;
};

/**
 * Guarda la configuracion. Actualiza la fila existente o inserta una nueva y
 * devuelve el id resultante, que la vista necesita para editar despues.
 */
export const saveCfdiSettings = async ({ settingId, payload }) => {
  if (settingId) {
    const { error } = await supabase
      .from("cfdi_settings")
      .update(payload)
      .eq("id", settingId);

    if (error) throw error;

    return settingId;
  }

  const { data, error } = await supabase
    .from("cfdi_settings")
    .insert({
      ...payload,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;

  return data.id;
};
