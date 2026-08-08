import { supabase } from "../../../lib/supabaseClient";

export const getRewardRedeemQuantity = (reward) => Math.max(Number(reward?.redeemQuantity || 1), 1);
export const getRewardProductsPerRedemption = (reward) => Math.max(Number(reward?.reward_quantity || 1), 1);
export const getRewardQuantity = (reward) => getRewardProductsPerRedemption(reward) * getRewardRedeemQuantity(reward);

export const fetchRewardProductsAndInventory = async (rewardIds, branchId) => {
  if (!rewardIds?.length) return { rewardProducts: [], inventoryMap: {} };

  const { data, error: rewardProductsError } = await supabase
    .from("reward_products")
    .select(`
      id, reward_id, product_id,
      products:product_id ( id, barcode, name, cost_price, sale_price, is_kit, status, tracks_inventory )
    `)
    .in("reward_id", rewardIds);

  if (rewardProductsError) throw rewardProductsError;

  const rows = (data || [])
    .map((row) => ({ ...row, product: row.products || null }))
    .filter((row) => row.product?.id);

  const productIds = [...new Set(rows.filter((r) => r.product?.tracks_inventory !== false).map((r) => r.product_id).filter(Boolean))];

  if (!branchId || productIds.length === 0) return { rewardProducts: rows, inventoryMap: {} };

  const { data: invRows, error: invError } = await supabase
    .from("branch_inventory")
    .select("product_id, stock, is_active, has_been_stocked, cost_price, sale_price")
    .eq("branch_id", branchId)
    .in("product_id", productIds);

  if (invError) throw invError;

  const inventoryMap = (invRows || []).reduce((acc, row) => ({ ...acc, [row.product_id]: row }), {});
  
  return { rewardProducts: rows, inventoryMap };
};