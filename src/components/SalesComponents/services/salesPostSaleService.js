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

// Helpers refactorizados
const emptyRewardRedemption = () => ({ registered: false, rows: [], totalPoints: 0, totalQuantity: 0, totalDiscountAmount: 0, error: null });
const emptyRewardPoints = () => ({ pointsUsed: 0, registered: false, newBalance: null, error: null });
const emptyPoints = () => ({ points: 0, amountPerPoint: DEFAULT_POINTS_AMOUNT, registered: false, newBalance: null, pointsUsed: 0, rewardRedemptions: [], error: null });

export const processSaleCustomerBenefits = async ({
  saleId, customerId = null, saleTotal = 0, saleDate, cartItems = [], branchId, userId,
}) => {
  let rewardRedemptionResult = emptyRewardRedemption();
  let rewardPointsResult = emptyRewardPoints();
  let pointsResult = emptyPoints();

  if (!customerId) return { pointsResult, rewardRedemptionResult, rewardPointsResult };

  const rewardItemsForSale = getRewardCartItems(cartItems);

  // 1. INTENTAR PROCESAR CANJES (Concurrencia)
  if (rewardItemsForSale.length > 0) {
    try {
      // Optimizamos ejecutando ambas promesas en paralelo
      const [redemptionRes, pointsRes] = await Promise.all([
        registerSaleRewardRedemptions({ saleId, customerId, saleDate, rewardItems: rewardItemsForSale, branchId, userId }),
        registerCustomerRewardPointsRedemption({ saleId, customerId, saleDate, rewardItems: rewardItemsForSale, branchId, userId })
      ]);
      
      rewardRedemptionResult = redemptionRes;
      rewardPointsResult = pointsRes;
    } catch (rewardError) {
      console.error("Error registrando canje de recompensas:", rewardError);
      rewardRedemptionResult = { ...emptyRewardRedemption(), error: rewardError };
      rewardPointsResult = { ...emptyRewardPoints(), error: rewardError };
    }
  }

  // 2. INTENTAR PROCESAR PUNTOS GANADOS Y OBTENER BALANCE FINAL
  try {
    // Aquí sí debe ser secuencial: primero damos puntos, luego consultamos el nuevo balance
    const earnedPointsResult = await registerCustomerPointsForSale({
      saleId, customerId, saleTotal: Number(saleTotal || 0), saleDate, userId, branchId,
    });

    const currentBalance = await getCustomerCurrentPointsBalance(customerId);

    pointsResult = {
      ...earnedPointsResult,
      newBalance: currentBalance,
      pointsUsed: Number(rewardPointsResult?.pointsUsed || 0),
      rewardRedemptions: rewardRedemptionResult?.rows || [],
      rewardError: rewardRedemptionResult?.error || rewardPointsResult?.error || null,
    };
  } catch (pointsError) {
    console.error("Error registrando puntos de cliente:", pointsError);
    pointsResult = {
      points: 0,
      amountPerPoint: DEFAULT_POINTS_AMOUNT,
      registered: false,
      newBalance: rewardPointsResult?.newBalance !== undefined ? rewardPointsResult.newBalance : null,
      pointsUsed: Number(rewardPointsResult?.pointsUsed || 0),
      rewardRedemptions: rewardRedemptionResult?.rows || [],
      error: pointsError,
      rewardError: rewardRedemptionResult?.error || rewardPointsResult?.error || null,
    };
  }

  return {
    pointsResult,
    rewardRedemptionResult,
    rewardPointsResult,
  };
};