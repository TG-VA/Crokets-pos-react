import { useState } from "react";

export const useSalesRewardsState = () => {
  const [currentSaleClient, setCurrentSaleClient] = useState(null);
  const [currentSaleReward, setCurrentSaleReward] = useState(null);
  const [pendingFreeProductRewards, setPendingFreeProductRewards] = useState([]);
  const [pendingProductDiscountRewards, setPendingProductDiscountRewards] = useState([]);
  const [activeProductDiscountReward, setActiveProductDiscountReward] = useState(null);

  return {
    currentSaleClient, setCurrentSaleClient,
    currentSaleReward, setCurrentSaleReward,
    pendingFreeProductRewards, setPendingFreeProductRewards,
    pendingProductDiscountRewards, setPendingProductDiscountRewards,
    activeProductDiscountReward, setActiveProductDiscountReward,
  };
};