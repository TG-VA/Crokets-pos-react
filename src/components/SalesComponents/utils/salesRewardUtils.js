export const normalizeRewardsArray = (
  value
) => {
  if (!value) return [];

  const normalizeRewardItem = (item) => {
    if (!item) return null;

    if (item.reward?.id) {
      return {
        ...item.reward,
        redeemQuantity: Math.max(
          Number(item.redeemQuantity || 1),
          1
        ),
      };
    }

    if (item.id) {
      return {
        ...item,
        redeemQuantity: Math.max(
          Number(item.redeemQuantity || 1),
          1
        ),
      };
    }

    return null;
  };

  if (Array.isArray(value)) {
    return value
      .map(normalizeRewardItem)
      .filter(Boolean);
  }

  const normalized =
    normalizeRewardItem(value);

  return normalized ? [normalized] : [];
};

export const getRewardRedeemQuantity = (
  reward
) => {
  return Math.max(
    Number(reward?.redeemQuantity || 1),
    1
  );
};

export const getRewardTotalPoints = (
  reward
) => {
  return (
    Number(reward?.points_required || 0) *
    getRewardRedeemQuantity(reward)
  );
};

export const getRewardType = (reward) => {
  return reward?.reward_type ===
    "product_discount"
    ? "product_discount"
    : "free_product";
};

export const isPendingProductDiscountReward = (
  reward
) => {
  return (
    getRewardType(reward) ===
      "product_discount" &&
    reward?.reward_application_status !==
      "applied_product_discount"
  );
};

export const isAppliedProductDiscountReward = (
  reward
) => {
  return (
    getRewardType(reward) ===
      "product_discount" &&
    reward?.reward_application_status ===
      "applied_product_discount"
  );
};

export const getPendingProductDiscountRewards = (
  rewardsValue
) => {
  return normalizeRewardsArray(
    rewardsValue
  ).filter(
    isPendingProductDiscountReward
  );
};

export const getRewardDiscountUnitAmount = (
  reward,
  basePrice
) => {
  const price = Number(basePrice || 0);
  const discountType = reward?.discount_type;
  const discountValue = Number(
    reward?.discount_value || 0
  );

  if (price <= 0 || discountValue <= 0) {
    return 0;
  }

  if (discountType === "percent") {
    return Math.min(
      Math.floor(
        price * (discountValue / 100)
      ),
      price
    );
  }

  if (discountType === "fixed") {
    return Math.min(
      Math.floor(discountValue),
      price
    );
  }

  return 0;
};

export const getRewardDiscountLabel = (
  reward
) => {
  const discountType = reward?.discount_type;
  const discountValue = Number(
    reward?.discount_value || 0
  );

  const quantity = Math.max(
    Number(reward?.reward_quantity || 1),
    1
  );

  const unitLabel =
    quantity === 1
      ? "unidad"
      : "unidades";

  if (discountType === "percent") {
    return `${discountValue}% en ${quantity} ${unitLabel}`;
  }

  if (discountType === "fixed") {
    return `$${discountValue.toFixed(
      2
    )} en ${quantity} ${unitLabel}`;
  }

  return `Descuento en ${quantity} ${unitLabel}`;
};

export const getSyncedRewardsFromCart = (
  cartItems = [],
  rewardsSource
) => {
  const rewardsMap = new Map();

  normalizeRewardsArray(
    rewardsSource
  ).forEach((reward) => {
    if (reward?.id) {
      rewardsMap.set(reward.id, reward);
    }
  });

  const rewardSummaryById = new Map();

  const normalizedCartItems =
    Array.isArray(cartItems)
      ? cartItems
      : [];

  normalizedCartItems
    .filter(
      (item) =>
        item?.is_reward_item ||
        item?.is_reward_discount_item
    )
    .forEach((item) => {
      const rewardId = item?.reward_id;

      if (!rewardId) return;

      const previous =
        rewardSummaryById.get(rewardId) || {
          rewardId,
          redeemQuantity: 0,
          appliedProductQuantity: 0,
          appliedDiscountAmount: 0,
          hasProductDiscount: false,
          productNames: [],
        };

      const lineRedeemQuantity = Math.max(
        Number(
          item.reward_redeem_quantity || 0
        ),
        0
      );

      const fallbackRedeemQuantity =
        Math.max(
          Number(item.cantidad || 1),
          1
        );

      const redeemQuantity =
        lineRedeemQuantity > 0
          ? lineRedeemQuantity
          : fallbackRedeemQuantity;

      const productName =
        item.nombre ||
        item.codigo ||
        "PRODUCTO";

      rewardSummaryById.set(rewardId, {
        ...previous,

        redeemQuantity:
          previous.redeemQuantity +
          redeemQuantity,

        appliedProductQuantity:
          previous.appliedProductQuantity +
          Math.max(
            Number(item.cantidad || 0),
            0
          ),

        appliedDiscountAmount:
          previous.appliedDiscountAmount +
          Math.max(
            Number(
              item.reward_discount_amount ??
                item.descuentoMonto ??
                0
            ),
            0
          ),

        hasProductDiscount:
          previous.hasProductDiscount ||
          Boolean(
            item.is_reward_discount_item
          ),

        productNames:
          previous.productNames.includes(
            productName
          )
            ? previous.productNames
            : [
                ...previous.productNames,
                productName,
              ],
      });
    });

  return Array.from(
    rewardSummaryById.values()
  ).map((summary) => {
    const baseReward =
      rewardsMap.get(summary.rewardId) || {};

    return {
      ...baseReward,

      id: summary.rewardId,

      name:
        baseReward.name ||
        "RECOMPENSA",

      redeemQuantity: Math.max(
        Number(
          summary.redeemQuantity || 1
        ),
        1
      ),

      appliedProductQuantity:
        Math.max(
          Number(
            summary.appliedProductQuantity ||
              1
          ),
          1
        ),

      appliedProductName:
        summary.productNames.join(", "),

      appliedDiscountAmount:
        Number(
          summary.appliedDiscountAmount || 0
        ),

      reward_application_status:
        summary.hasProductDiscount
          ? "applied_product_discount"
          : baseReward.reward_application_status,
    };
  });
};