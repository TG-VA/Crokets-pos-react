import { useSalesCartContext } from "../../../contexts/SalesCartContext";

/**
 * El cliente asignado y las recompensas pendientes viven en el contexto de la
 * venta para no perderse al cambiar de modulo. La asignacion del cliente
 * ademas expira a los cinco minutos sin una venta cobrada.
 */
export const useSalesRewardsState = () => {
  const {
    currentSaleClient,
    setCurrentSaleClient,
    currentSaleReward,
    setCurrentSaleReward,
    pendingFreeProductRewards,
    setPendingFreeProductRewards,
    pendingProductDiscountRewards,
    setPendingProductDiscountRewards,
    activeProductDiscountReward,
    setActiveProductDiscountReward,
  } = useSalesCartContext();

  return {
    currentSaleClient,
    setCurrentSaleClient,
    currentSaleReward,
    setCurrentSaleReward,
    pendingFreeProductRewards,
    setPendingFreeProductRewards,
    pendingProductDiscountRewards,
    setPendingProductDiscountRewards,
    activeProductDiscountReward,
    setActiveProductDiscountReward,
  };
};
