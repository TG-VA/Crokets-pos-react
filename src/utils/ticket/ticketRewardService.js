import { normalizeSpaces, normalizeUpper } from "./ticketLayoutFormatters";
import {
  toNumber,
  getItemDescription,
  getItemLineTotal,
  getItemOriginalUnitPrice,
  getItemPaidUnitPrice,
  getItemDiscountAmount,
} from "./ticketItemFormatters";

export const getRewardTypeFromValue = (value = {}) => {
  const rawType = normalizeSpaces(
    value.reward_type ||
      value.rewardType ||
      value.type ||
      value.reward?.reward_type ||
      value.rewards?.reward_type ||
      ""
  ).toLowerCase();

  if (rawType === "product_discount") return "product_discount";
  if (rawType === "free_product") return "free_product";

  return "";
};

export const isRewardDiscountItem = (item = {}) => {
  const rewardType = getRewardTypeFromValue(item);
  const lineTotal = getItemLineTotal(item);
  const discountAmount = getItemDiscountAmount(item);
  const originalUnitPrice = getItemOriginalUnitPrice(item);
  const paidUnitPrice = getItemPaidUnitPrice(item);

  const rewardName = normalizeUpper(
    item.reward_name ||
      item.rewardName ||
      item.discountConcept ||
      item.discount_concept ||
      item.reward?.name ||
      item.rewards?.name ||
      ""
  );

  const hasRewardIdentifier = Boolean(
    item.reward_id ||
      item.rewardId ||
      item.sale_reward_redemption_id ||
      item.saleRewardRedemptionId
  );

  return Boolean(
    item.is_reward_discount_item ||
      item.isRewardDiscountItem ||
      item.reward_discount_item ||
      item.rewardDiscountItem ||
      rewardType === "product_discount" ||
      rewardName.includes("DESCUENTO") ||
      rewardName.includes("DESC") ||
      rewardName.includes("%") ||
      rewardName.includes("OFF") ||
      (hasRewardIdentifier && lineTotal > 0 && discountAmount > 0) ||
      (hasRewardIdentifier &&
        lineTotal > 0 &&
        originalUnitPrice > paidUnitPrice)
  );
};

export const isFreeRewardItem = (item = {}) => {
  const rewardType = getRewardTypeFromValue(item);

  if (isRewardDiscountItem(item)) return false;

  return Boolean(
    item.is_reward_item ||
      item.isRewardItem ||
      item.reward_item ||
      item.rewardItem ||
      item.is_reward ||
      item.isReward ||
      rewardType === "free_product" ||
      item.reward_id ||
      item.rewardId ||
      item.sale_reward_redemption_id ||
      item.saleRewardRedemptionId
  );
};

export const isRewardItem = (item = {}) => {
  return isFreeRewardItem(item) || isRewardDiscountItem(item);
};

export const getRewardItemsFromSale = (sale = {}) => {
  const possibleLists = [
    sale.reward_redemptions,
    sale.rewardRedemptions,
    sale.rewards_redeemed,
    sale.rewardsRedeemed,
    sale.redeemed_rewards,
    sale.redeemedRewards,
    sale.applied_rewards,
    sale.appliedRewards,
    sale.rewardItems,
    sale.reward_items,
  ];

  const directList = possibleLists.find((items) => Array.isArray(items));

  if (directList) return directList;

  return [];
};

export const detectRewardType = (reward = {}) => {
  const explicitType = getRewardTypeFromValue(reward);
  const rewardName = normalizeUpper(
    reward.rewardName ||
      reward.reward_name ||
      reward.name ||
      reward.reward ||
      reward.rewards?.name ||
      ""
  );

  const discountAmount = toNumber(
    reward.discount_amount ||
      reward.discountAmount ||
      reward.reward_discount_amount ||
      reward.rewardDiscountAmount ||
      0
  );

  const unitPrice = toNumber(
    reward.unit_price ||
      reward.unitPrice ||
      reward.original_unit_price ||
      reward.originalUnitPrice ||
      0
  );

  const looksLikeDiscount = Boolean(
    rewardName.includes("DESCUENTO") ||
      rewardName.includes("DESC") ||
      rewardName.includes("%") ||
      rewardName.includes("OFF") ||
      discountAmount > 0
  );

  if (explicitType === "product_discount") return "product_discount";

  if (explicitType === "free_product") {
    return looksLikeDiscount ? "product_discount" : "free_product";
  }

  if (looksLikeDiscount || (discountAmount > 0 && unitPrice > 0)) {
    return "product_discount";
  }

  return "free_product";
};

export const normalizeRewardRedemptions = (sale = {}, items = []) => {
  const rewardRows = getRewardItemsFromSale(sale);

  if (rewardRows.length > 0) {
    return rewardRows
      .map((reward) => {
        const rewardName =
          reward.reward_name ||
          reward.rewardName ||
          reward.name ||
          reward.reward ||
          reward.rewards?.name ||
          "RECOMPENSA";

        const productName =
          reward.product_name ||
          reward.productName ||
          reward.product ||
          reward.producto ||
          reward.products?.name ||
          "";

        const quantity = toNumber(
          reward.quantity ||
            reward.qty ||
            reward.reward_quantity ||
            reward.rewardQuantity ||
            reward.redeemQuantity ||
            1
        );

        const pointsPerUnit = Math.abs(
          toNumber(
            reward.points_per_unit ||
              reward.pointsPerUnit ||
              reward.reward_points ||
              reward.rewardPoints ||
              reward.points ||
              0
          )
        );

        const totalPoints = Math.abs(
          toNumber(
            reward.total_points ||
              reward.totalPoints ||
              reward.points_used ||
              reward.pointsUsed ||
              reward.total_reward_points ||
              reward.totalRewardPoints ||
              pointsPerUnit * (quantity || 1)
          )
        );

        return {
          rewardName: normalizeUpper(rewardName || "RECOMPENSA"),
          productName: normalizeUpper(productName || ""),
          quantity: quantity > 0 ? quantity : 1,
          pointsPerUnit,
          totalPoints,
          rewardType: detectRewardType(reward),
          unitPrice: toNumber(
            reward.unit_price ||
              reward.unitPrice ||
              reward.original_unit_price ||
              reward.originalUnitPrice ||
              0
          ),
          discountAmount: toNumber(
            reward.discount_amount ||
              reward.discountAmount ||
              reward.reward_discount_amount ||
              reward.rewardDiscountAmount ||
              0
          ),
          reversedAt:
            reward.reversed_at ||
            reward.reversedAt ||
            reward.reversal_date ||
            reward.reversalDate ||
            null,
          reversedBy: reward.reversed_by || reward.reversedBy || null,
          reversalReason:
            reward.reversal_reason || reward.reversalReason || "",
        };
      })
      .filter((reward) => reward.rewardName);
  }

  return (items || [])
    .filter((item) => isRewardItem(item))
    .map((item) => {
      const rewardName =
        item.reward_name ||
        item.rewardName ||
        item.reward?.name ||
        item.reward_label ||
        item.rewardLabel ||
        "RECOMPENSA";

      const productName =
        item.product_name ||
        item.productName ||
        item.description ||
        item.name ||
        item.nombre ||
        "PRODUCTO";

      const quantity = toNumber(item.quantity ?? item.qty ?? item.cantidad ?? 1);

      const pointsPerUnit = Math.abs(
        toNumber(
          item.points_per_unit ||
            item.pointsPerUnit ||
            item.reward_points ||
            item.rewardPoints ||
            item.points ||
            0
        )
      );

      const totalPoints = Math.abs(
        toNumber(
          item.total_points ||
            item.totalPoints ||
            item.points_used ||
            item.pointsUsed ||
            pointsPerUnit * (quantity || 1)
        )
      );

      return {
        rewardName: normalizeUpper(rewardName || "RECOMPENSA"),
        productName: normalizeUpper(productName || "PRODUCTO"),
        quantity: quantity > 0 ? quantity : 1,
        pointsPerUnit,
        totalPoints,
        rewardType: isRewardDiscountItem(item)
          ? "product_discount"
          : "free_product",
        unitPrice: getItemOriginalUnitPrice(item),
        discountAmount: getItemDiscountAmount(item),
        reversedAt:
          item.reversed_at ||
          item.reversedAt ||
          item.reversal_date ||
          item.reversalDate ||
          null,
        reversedBy: item.reversed_by || item.reversedBy || null,
        reversalReason: item.reversal_reason || item.reversalReason || "",
      };
    })
    .filter((reward) => reward.rewardName);
};

export const getRewardPointsUsed = (sale = {}, items = []) => {
  const directValue = Math.abs(
    toNumber(
      sale.reward_points_used ??
        sale.rewardPointsUsed ??
        sale.points_used ??
        sale.pointsUsed ??
        sale.points_redeemed ??
        sale.pointsRedeemed ??
        sale.total_reward_points ??
        sale.totalRewardPoints ??
        sale.total_points_used ??
        sale.totalPointsUsed
    )
  );

  if (directValue > 0) return directValue;

  return normalizeRewardRedemptions(sale, items).reduce((acc, reward) => {
    return acc + Math.abs(toNumber(reward.totalPoints));
  }, 0);
};

export const getRewardCount = (sale = {}, items = []) => {
  const directValue = toNumber(
    sale.rewards_count ??
      sale.rewardsCount ??
      sale.reward_redemptions_count ??
      sale.rewardRedemptionsCount ??
      sale.canjes_aplicados ??
      sale.canjesAplicados ??
      sale.rewards_applied_count ??
      sale.rewardsAppliedCount
  );

  if (directValue > 0) return directValue;

  return normalizeRewardRedemptions(sale, items).reduce((acc, reward) => {
    return acc + toNumber(reward.quantity || 1);
  }, 0);
};

export const hasRewardActivity = (sale = {}, items = []) => {
  return Boolean(
    sale.is_reward_redemption_only ||
      sale.isRewardRedemptionOnly ||
      sale.is_zero_total_sale ||
      sale.isZeroTotalSale ||
      sale.has_reward_redemptions ||
      sale.hasRewardRedemptions ||
      getRewardPointsUsed(sale, items) > 0 ||
      getRewardCount(sale, items) > 0 ||
      (items || []).some((item) => isRewardItem(item))
  );
};

export const findRewardForItem = (item = {}, rewardRedemptions = []) => {
  if (!item || rewardRedemptions.length === 0) return null;

  const itemRewardId = String(item.reward_id || item.rewardId || "").trim();

  if (itemRewardId) {
    const byId = rewardRedemptions.find((reward) => {
      return (
        String(reward.reward_id || reward.rewardId || "").trim() ===
        itemRewardId
      );
    });

    if (byId) return byId;
  }

  const itemName = getItemDescription(item);

  if (itemName) {
    const byProductName = rewardRedemptions.find((reward) => {
      return reward.productName && reward.productName === itemName;
    });

    if (byProductName) return byProductName;
  }

  return null;
};

export const getRewardVisualTypeForItem = (item = {}, rewardRedemptions = []) => {
  if (isRewardDiscountItem(item)) return "product_discount";

  const matchedReward = findRewardForItem(item, rewardRedemptions);
  const matchedRewardName = normalizeUpper(matchedReward?.rewardName || "");
  const matchedLooksLikeDiscount = Boolean(
    matchedReward?.rewardType === "product_discount" ||
      matchedRewardName.includes("DESCUENTO") ||
      matchedRewardName.includes("DESC") ||
      matchedRewardName.includes("%") ||
      matchedRewardName.includes("OFF") ||
      toNumber(matchedReward?.discountAmount) > 0
  );

  if (matchedLooksLikeDiscount) return "product_discount";

  if (isFreeRewardItem(item)) return "free_product";

  if (!matchedReward) return "";

  if (
    getItemLineTotal(item) > 0 &&
    (getItemDiscountAmount(item) > 0 ||
      getItemOriginalUnitPrice(item) > getItemPaidUnitPrice(item))
  ) {
    return "product_discount";
  }

  return "free_product";
};
