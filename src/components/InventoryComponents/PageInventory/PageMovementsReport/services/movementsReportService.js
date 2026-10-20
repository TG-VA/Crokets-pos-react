import { DEFAULT_MAX_MOVEMENTS } from "./movementServiceConstants";

import {
  loadBaseMovements,
  loadCanceledSalesBySales,
  loadProducts,
  loadReturnItemsByReturns,
  loadRewardRedemptions,
  loadRewards,
  loadSaleDetailsBySales,
  loadSaleReturnsBySales,
  loadSales,
  loadUsers,
} from "./movementQueriesService";

import {
  buildNoStockRows,
  hydrateBaseMovements,
  hydrateMissingRedemptions,
} from "./movementReportBuilder";

import {
  createEntityMap,
  getUniqueIds,
  sortMovementsByDate,
} from "./movementServiceUtils";

export {
  DEFAULT_MAX_MOVEMENTS,
  INVENTORY_MOVEMENTS_TABLE,
  POLI_BRANCH_ID,
  REWARD_REDEMPTIONS_TABLE,
} from "./movementServiceConstants";

export { loadMovementBranches } from "./movementQueriesService";

export const loadMovementsReport = async ({
  branchId,
  maxMovements = DEFAULT_MAX_MOVEMENTS,
}) => {
  const [baseRows, rewardRows] = await Promise.all([
    loadBaseMovements({
      branchId,
      maxMovements,
    }),

    loadRewardRedemptions({
      branchId,
      maxMovements,
    }),
  ]);

  const allRows = [...baseRows, ...rewardRows];

  const userIds = getUniqueIds(allRows, "user_id");

  const saleIds = getUniqueIds(allRows, "sale_id");

  const rewardIds = getUniqueIds(rewardRows, "reward_id");

  const saleDetails = await loadSaleDetailsBySales(saleIds);

  const productIds = Array.from(
    new Set([
      ...getUniqueIds(allRows, "product_id"),
      ...getUniqueIds(saleDetails, "product_id"),
    ])
  );

  const [products, users, sales, rewards, canceledSales, saleReturns] =
    await Promise.all([
      loadProducts(productIds),
      loadUsers(userIds),
      loadSales(saleIds),
      loadRewards(rewardIds),
      loadCanceledSalesBySales(saleIds),
      loadSaleReturnsBySales(saleIds),
    ]);

  const returnItems = await loadReturnItemsByReturns(
    getUniqueIds(saleReturns, "id")
  );

  const productsById = createEntityMap(products);

  const usersById = createEntityMap(users);

  const salesById = createEntityMap(sales);

  const rewardsById = createEntityMap(rewards);

  const hydratedMovements = hydrateBaseMovements({
    baseRows,
    rewardRows,
    productsById,
    usersById,
    salesById,
    rewardsById,
  });

  const hydratedRedemptions = hydrateMissingRedemptions({
    baseRows,
    rewardRows,
    productsById,
    usersById,
    salesById,
    rewardsById,
  });

  const existingSaleProductKeys = new Set(
    baseRows
      .filter(
        (row) => String(row?.movement_type ?? "").toLowerCase() === "sale"
      )
      .map((row) => `${row?.sale_id}::${row?.product_id}`)
  );

  const noStockRows = buildNoStockRows({
    saleDetails,
    canceledSales,
    saleReturns,
    returnItems,
    productsById,
    usersById,
    salesById,
    existingSaleProductKeys,
  });

  return sortMovementsByDate([
    ...hydratedMovements,
    ...hydratedRedemptions,
    ...noStockRows,
  ]);
};
