/**
 * rewardsSettingsService.js
 * Consultas y mutaciones de la configuracion de recompensas y de la regla de
 * acumulacion de puntos (`system_settings`).
 */

import { supabase } from "../../../../../lib/supabaseClient";

export const POINTS_AMOUNT_SETTING_KEY = "customer_points_amount_per_point";
export const DEFAULT_POINTS_AMOUNT = 50;

const POINTS_AMOUNT_DESCRIPTION =
  "Monto de venta en MXN necesario para generar 1 punto de cliente. El cálculo redondea hacia abajo.";

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

const REWARDS_COLUMNS = `
          id,
          name,
          description,
          points_required,
          is_active,
          reward_type,
          reward_quantity,
          discount_type,
          discount_value,
          created_at,
          updated_at,
          reward_products (
            id,
            product_id
          )
        `;

const buildSettingRow = (settingValue) => ({
  id: crypto.randomUUID(),
  setting_key: POINTS_AMOUNT_SETTING_KEY,
  setting_value: settingValue,
  value_type: "number",
  description: POINTS_AMOUNT_DESCRIPTION,
  branch_id: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

/**
 * Recompensas con sus productos vinculados.
 */
export const fetchRewardsCatalog = async () => {
  const { data, error } = await supabase
    .from("rewards")
    .select(REWARDS_COLUMNS)
    .order("is_active", { ascending: false, nullsFirst: false })
    .order("points_required", { ascending: true })
    .order("name", { ascending: true, nullsFirst: false });

  if (error) throw error;

  return data || [];
};

/**
 * Regla de acumulacion de puntos. Si no existe todavia, la crea con el valor
 * predeterminado para que la pantalla siempre tenga una regla que leer.
 *
 * @returns {Promise<string>} Valor de la regla, ya sea el almacenado o el
 * predeterminado recien insertado.
 */
export const fetchOrCreatePointsAmountRule = async () => {
  const defaultValue = String(DEFAULT_POINTS_AMOUNT);

  const { data, error } = await supabase
    .from("system_settings")
    .select(SETTING_COLUMNS)
    .eq("setting_key", POINTS_AMOUNT_SETTING_KEY)
    .is("branch_id", null)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const { error: insertError } = await supabase
      .from("system_settings")
      .insert([buildSettingRow(defaultValue)]);

    if (insertError) throw insertError;

    return defaultValue;
  }

  return String(data.setting_value || DEFAULT_POINTS_AMOUNT);
};

/**
 * Guarda la regla de acumulacion, insertandola si todavia no existe.
 */
export const savePointsAmountRule = async (settingValue) => {
  const normalizedAmount = String(settingValue);

  const { data: existingSetting, error: existingError } = await supabase
    .from("system_settings")
    .select("id")
    .eq("setting_key", POINTS_AMOUNT_SETTING_KEY)
    .is("branch_id", null)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingSetting?.id) {
    const { error: updateError } = await supabase
      .from("system_settings")
      .update({
        setting_value: normalizedAmount,
        value_type: "number",
        description: POINTS_AMOUNT_DESCRIPTION,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingSetting.id);

    if (updateError) throw updateError;

    return;
  }

  const { error: insertError } = await supabase
    .from("system_settings")
    .insert([buildSettingRow(normalizedAmount)]);

  if (insertError) throw insertError;
};

/**
 * Activa o desactiva una recompensa.
 */
export const updateRewardStatus = async ({ rewardId, nextStatus }) => {
  const { error } = await supabase
    .from("rewards")
    .update({
      is_active: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rewardId);

  if (error) throw error;
};
