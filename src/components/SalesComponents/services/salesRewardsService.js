import { supabase } from "../../../lib/supabaseClient";
import { getCustomerCurrentPointsBalance } from "./salesCustomerPointsService";

const getValidRewardItems = (rewardItems = []) =>
  (rewardItems || []).filter((item) => (item?.is_reward_item || item?.is_reward_discount_item) && item?.reward_id && Number(item?.cantidad || 0) > 0);

export const getRewardCartItems = (cartItems = []) => getValidRewardItems(cartItems);

export const getRewardItemTotalPoints = (item) => {
  const linePoints = Number(item?.reward_line_points_required || 0);
  if (linePoints > 0) return Math.round(linePoints);

  const rewardPoints = Number(item?.reward_points_required || 0);
  if (rewardPoints > 0) return Math.round(rewardPoints);

  const pointsPerReward = Number(item?.points_required || 0);
  const rewardQty = Math.max(Number(item?.reward_quantity || 1), 1);
  const itemQty = Math.max(Number(item?.cantidad || 0), 0);

  return (pointsPerReward > 0 && itemQty > 0) ? Math.round(pointsPerReward * (itemQty / rewardQty)) : 0;
};

export const getRewardItemPointsPerUnit = (item) => {
  const quantity = Math.max(Number(item?.cantidad || 0), 1);
  const totalPoints = getRewardItemTotalPoints(item);
  return totalPoints <= 0 ? 1 : Math.max(Math.round(totalPoints / quantity), 1);
};

export const getRewardItemsSummary = (rewardItems = []) => {
  return (rewardItems || []).reduce((summary, item) => {
    summary.totalPoints += getRewardItemTotalPoints(item);
    summary.totalQuantity += Number(item?.cantidad || 0);
    summary.totalDiscountAmount += Number(item?.reward_discount_amount ?? item?.descuentoMonto ?? 0);
    return summary;
  }, { totalPoints: 0, totalQuantity: 0, totalDiscountAmount: 0 });
};

const findSaleDetailForRewardItem = (rewardItem, saleDetails = [], usedDetailIds = new Set()) => {
  if (!rewardItem?.id) return null;

  const itemQty = Number(rewardItem.cantidad || 0);
  const itemDisc = Number(rewardItem.descuentoMonto || 0);

  const candidates = (saleDetails || []).filter((detail) => {
    if (usedDetailIds.has(detail.id) || detail.product_id !== rewardItem.id) return false;
    if (rewardItem?.is_reward_discount_item) return Number(detail.quantity || 0) === itemQty;
    return Number(detail.final_unit_price ?? detail.unit_price ?? 0) === 0;
  });

  if (!candidates.length) return null;

  return candidates.find((d) => Number(d.quantity || 0) === itemQty && Number(d.discount_amount || 0) === itemDisc)
    || candidates.find((d) => Number(d.quantity || 0) === itemQty)
    || candidates[0] || null;
};

const loadSaleDetailsForRewardRedemptions = async (saleId) => {
  if (!saleId) return [];
  const { data, error } = await supabase
    .from("sale_details")
    .select("id, sale_id, product_id, quantity, unit_price, total_price, original_unit_price, final_unit_price, discount_amount")
    .eq("sale_id", saleId);

  if (error) throw error;
  return data || [];
};

export const registerSaleRewardRedemptions = async ({ saleId, customerId, saleDate, rewardItems = [], branchId, userId }) => {
  const emptyResult = { registered: false, rows: [], totalPoints: 0, totalQuantity: 0, totalDiscountAmount: 0 };
  if (!saleId || !customerId || !branchId || !userId) return emptyResult;

  const validItems = getValidRewardItems(rewardItems);
  if (!validItems.length) return emptyResult;

  const { data: existingRows, error: existingError } = await supabase.from("sale_reward_redemptions").select("id").eq("sale_id", saleId).limit(1);
  if (existingError) throw existingError;

  const summary = getRewardItemsSummary(validItems);
  if ((existingRows || []).length > 0) return { registered: false, rows: [], ...summary };

  const saleDetails = await loadSaleDetailsForRewardRedemptions(saleId);
  const usedDetailIds = new Set();

  const redemptionRows = validItems.map((item) => {
    const quantity = Number(item.cantidad || 0);
    const pointsPerUnit = getRewardItemPointsPerUnit(item);
    const unitPrice = Number(item.precioOriginal ?? item.precio ?? 0);
    const discountAmount = Number(item.reward_discount_amount ?? item.descuentoMonto ?? (unitPrice * quantity) ?? 0);

    const detailRow = findSaleDetailForRewardItem(item, saleDetails, usedDetailIds);
    if (detailRow?.id) usedDetailIds.add(detailRow.id);

    return {
      id: crypto.randomUUID(),
      sale_id: saleId,
      sale_detail_id: detailRow?.id || null,
      customer_id: customerId,
      reward_id: item.reward_id,
      product_id: item.id,
      branch_id: branchId,
      user_id: userId,
      quantity,
      points_per_unit: pointsPerUnit,
      total_points: Math.max(getRewardItemTotalPoints(item), pointsPerUnit),
      unit_price: unitPrice,
      discount_amount: discountAmount,
      reward_name: item.reward_name || item.discountConcept || "RECOMPENSA",
      product_name: item.nombre || item.codigo || "PRODUCTO",
      status: "applied",
      created_at: saleDate || new Date().toISOString(),
    };
  });

  const { error: insertError } = await supabase.from("sale_reward_redemptions").insert(redemptionRows);
  if (insertError) throw insertError;

  const returnedRows = redemptionRows.map((row) => {
    const sourceItem = validItems.find((i) => i.reward_id === row.reward_id && i.id === row.product_id);
    return { ...row, reward_type: sourceItem?.is_reward_discount_item ? "product_discount" : "free_product" };
  });

  return { registered: true, rows: returnedRows, ...summary };
};

export const registerCustomerRewardPointsRedemption = async ({ saleId, customerId, saleDate, rewardItems = [], branchId, userId }) => {
  const getFallback = async (pointsUsed = 0) => ({
    pointsUsed, registered: false, newBalance: customerId ? await getCustomerCurrentPointsBalance(customerId) : null
  });

  if (!saleId || !customerId || !branchId || !userId) return getFallback();

  const validItems = getValidRewardItems(rewardItems);
  if (!validItems.length) return getFallback();

  const { data: existingMovement, error: existingError } = await supabase
    .from("customer_points").select("id").eq("customer_id", customerId)
    .eq("related_sale_id", saleId).eq("source", "reward").limit(1).maybeSingle();

  if (existingError) throw existingError;

  // Agrupar recompensas (Refactorizado con reduce para no crear 3 objetos separados)
  const rewardMap = validItems.reduce((acc, item) => {
    const rId = item.reward_id;
    if (!acc[rId]) acc[rId] = { points: 0, qty: 0, name: item.reward_name || item.discountConcept || "RECOMPENSA" };
    acc[rId].points += getRewardItemTotalPoints(item);
    acc[rId].qty += Number(item.cantidad || 0);
    return acc;
  }, {});

  const totalPointsUsed = Object.values(rewardMap).reduce((sum, r) => sum + r.points, 0);
  if (totalPointsUsed <= 0 || existingMovement?.id) return getFallback(totalPointsUsed);

  const movementRows = Object.entries(rewardMap)
    .filter(([, data]) => data.points > 0)
    .map(([rewardId, data]) => ({
      id: crypto.randomUUID(),
      customer_id: customerId,
      points: Math.abs(Math.round(data.points)) * -1, // Resta los puntos correctamente
      movement_type: "redeem",
      source: "reward",
      related_sale_id: saleId,
      reward_id: rewardId,
      user_id: userId,
      branch_id: branchId,
      notes: `CANJE DE RECOMPENSA EN VENTA. RECOMPENSA: ${data.name}. CANTIDAD ENTREGADA: ${data.qty}.`,
      created_at: saleDate || new Date().toISOString(),
    }));

  if (movementRows.length > 0) {
    const { error: insertError } = await supabase.from("customer_points").insert(movementRows);
    if (insertError) throw insertError;
  }

  return { pointsUsed: totalPointsUsed, registered: movementRows.length > 0, newBalance: await getCustomerCurrentPointsBalance(customerId) };
};