/**
 * rewardModalService.js
 * Consultas y mutaciones de Supabase para el modal de recompensas.
 */

import { supabase } from "../../../../lib/supabaseClient";
import { diffRewardProductIds } from "./rewardModalCalculationService";

/**
 * Catalogo de productos disponibles para vincular a una recompensa.
 */
export const fetchRewardProductsCatalog = async () => {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      barcode,
      name,
      sale_price
    `
    )
    .order("name", { ascending: true });

  if (error) throw error;

  return data || [];
};

/**
 * Ids de productos ya vinculados a una recompensa.
 */
export const fetchRewardProductIds = async (rewardId) => {
  if (!rewardId) return [];

  const { data, error } = await supabase
    .from("reward_products")
    .select("product_id")
    .eq("reward_id", rewardId);

  if (error) throw error;

  return (data || []).map((item) => item.product_id);
};

/**
 * Busca una recompensa por nombre, excluyendo la que se esta editando.
 */
export const findRewardByName = async (name, excludeId = null) => {
  let query = supabase
    .from("rewards")
    .select("id, name")
    .eq("name", name)
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data?.[0] || null;
};

/**
 * Crea o actualiza la recompensa y devuelve su id.
 */
export const persistReward = async ({ rewardToEdit, payload }) => {
  if (rewardToEdit?.id) {
    const { data, error } = await supabase
      .from("rewards")
      .update(payload)
      .eq("id", rewardToEdit.id)
      .select("id")
      .single();

    if (error) throw error;

    return data.id;
  }

  const rewardId = crypto.randomUUID();

  const { data, error } = await supabase
    .from("rewards")
    .insert([
      {
        id: rewardId,
        ...payload,
        created_at: new Date().toISOString(),
      },
    ])
    .select("id")
    .single();

  if (error) throw error;

  return data.id;
};

/**
 * Sincroniza la tabla `reward_products` con la seleccion actual.
 */
export const syncRewardProducts = async ({
  rewardId,
  rewardType,
  selectedProductIds,
}) => {
  const { data: currentRows, error: currentRowsError } = await supabase
    .from("reward_products")
    .select("product_id")
    .eq("reward_id", rewardId);

  if (currentRowsError) throw currentRowsError;

  const currentProductIds = (currentRows || []).map((row) => row.product_id);

  if (rewardType !== "free_product") {
    if (currentProductIds.length > 0) {
      const { error: deleteAllError } = await supabase
        .from("reward_products")
        .delete()
        .eq("reward_id", rewardId);

      if (deleteAllError) throw deleteAllError;
    }

    return;
  }

  const { productIdsToInsert, productIdsToDelete } = diffRewardProductIds(
    currentProductIds,
    selectedProductIds
  );

  if (productIdsToInsert.length > 0) {
    const rowsToInsert = productIdsToInsert.map((productId) => ({
      id: crypto.randomUUID(),
      reward_id: rewardId,
      product_id: productId,
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("reward_products")
      .insert(rowsToInsert);

    if (insertError) throw insertError;
  }

  if (productIdsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("reward_products")
      .delete()
      .eq("reward_id", rewardId)
      .in("product_id", productIdsToDelete);

    if (deleteError) throw deleteError;
  }
};
