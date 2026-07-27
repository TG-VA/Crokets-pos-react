import {
  DEFAULT_POINTS_AMOUNT,
  getCustomerCurrentPointsBalance,
  registerCustomerPointsForSale,
} from "./salesCustomerPointsService";

import {
  getRewardCartItems,
  registerCustomerRewardPointsRedemption,
  registerSaleRewardRedemptions,
} from "./salesRewardsService";

const buildEmptyRewardRedemptionResult = () => {
  return {
    registered: false,
    rows: [],
    totalPoints: 0,
    totalQuantity: 0,
    totalDiscountAmount: 0,
    error: null,
  };
};

const buildEmptyRewardPointsResult = () => {
  return {
    pointsUsed: 0,
    registered: false,
    newBalance: null,
    error: null,
  };
};

const buildEmptyPointsResult = () => {
  return {
    points: 0,
    amountPerPoint:
      DEFAULT_POINTS_AMOUNT,
    registered: false,
    newBalance: null,
    pointsUsed: 0,
    rewardRedemptions: [],
    error: null,
  };
};

export const processSaleCustomerBenefits =
  async ({
    saleId,
    customerId = null,
    saleTotal = 0,
    saleDate,
    cartItems = [],
    branchId,
    userId,
  }) => {
    let rewardRedemptionResult =
      buildEmptyRewardRedemptionResult();

    let rewardPointsResult =
      buildEmptyRewardPointsResult();

    let pointsResult =
      buildEmptyPointsResult();

    if (!customerId) {
      return {
        pointsResult,
        rewardRedemptionResult,
        rewardPointsResult,
      };
    }

    const rewardItemsForSale =
      getRewardCartItems(cartItems);

    if (
      rewardItemsForSale.length > 0
    ) {
      try {
        rewardRedemptionResult =
          await registerSaleRewardRedemptions({
            saleId,
            customerId,
            saleDate,
            rewardItems:
              rewardItemsForSale,
            branchId,
            userId,
          });

        rewardPointsResult =
          await registerCustomerRewardPointsRedemption({
            saleId,
            customerId,
            saleDate,
            rewardItems:
              rewardItemsForSale,
            branchId,
            userId,
          });
      } catch (rewardError) {
        console.error(
          "Error registrando canje de recompensas:",
          rewardError,
        );

        rewardRedemptionResult = {
          ...buildEmptyRewardRedemptionResult(),
          error: rewardError,
        };

        rewardPointsResult = {
          ...buildEmptyRewardPointsResult(),
          error: rewardError,
        };
      }
    }

    try {
      const earnedPointsResult =
        await registerCustomerPointsForSale({
          saleId,
          customerId,
          saleTotal: Number(
            saleTotal || 0,
          ),
          saleDate,
          userId,
          branchId,
        });

      const currentBalance =
        await getCustomerCurrentPointsBalance(
          customerId,
        );

      pointsResult = {
        ...earnedPointsResult,
        newBalance:
          currentBalance,
        pointsUsed: Number(
          rewardPointsResult
            ?.pointsUsed || 0,
        ),
        rewardRedemptions:
          rewardRedemptionResult
            ?.rows || [],
        rewardError:
          rewardRedemptionResult
            ?.error ||
          rewardPointsResult?.error ||
          null,
      };
    } catch (pointsError) {
      console.error(
        "Error registrando puntos de cliente:",
        pointsError,
      );

      pointsResult = {
        points: 0,
        amountPerPoint:
          DEFAULT_POINTS_AMOUNT,
        registered: false,
        newBalance:
          rewardPointsResult
            ?.newBalance !==
          undefined
            ? rewardPointsResult
                .newBalance
            : null,
        pointsUsed: Number(
          rewardPointsResult
            ?.pointsUsed || 0,
        ),
        rewardRedemptions:
          rewardRedemptionResult
            ?.rows || [],
        error: pointsError,
        rewardError:
          rewardRedemptionResult
            ?.error ||
          rewardPointsResult?.error ||
          null,
      };
    }

    return {
      pointsResult,
      rewardRedemptionResult,
      rewardPointsResult,
    };
  };