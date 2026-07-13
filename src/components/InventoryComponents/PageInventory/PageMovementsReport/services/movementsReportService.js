import {
  DEFAULT_MAX_MOVEMENTS,
} from "./movementServiceConstants";

import {
  loadBaseMovements,
  loadProducts,
  loadRewardRedemptions,
  loadRewards,
  loadSales,
  loadUsers,
} from "./movementQueriesService";

import {
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

export {
  loadMovementBranches,
} from "./movementQueriesService";

export const loadMovementsReport =
  async ({
    branchId,
    maxMovements =
      DEFAULT_MAX_MOVEMENTS,
  }) => {
    const [
      baseRows,
      rewardRows,
    ] = await Promise.all([
      loadBaseMovements({
        branchId,
        maxMovements,
      }),

      loadRewardRedemptions({
        branchId,
        maxMovements,
      }),
    ]);

    const allRows = [
      ...baseRows,
      ...rewardRows,
    ];

    const productIds =
      getUniqueIds(
        allRows,
        "product_id"
      );

    const userIds =
      getUniqueIds(
        allRows,
        "user_id"
      );

    const saleIds =
      getUniqueIds(
        allRows,
        "sale_id"
      );

    const rewardIds =
      getUniqueIds(
        rewardRows,
        "reward_id"
      );

    const [
      products,
      users,
      sales,
      rewards,
    ] = await Promise.all([
      loadProducts(productIds),
      loadUsers(userIds),
      loadSales(saleIds),
      loadRewards(rewardIds),
    ]);

    const productsById =
      createEntityMap(products);

    const usersById =
      createEntityMap(users);

    const salesById =
      createEntityMap(sales);

    const rewardsById =
      createEntityMap(rewards);

    const hydratedMovements =
      hydrateBaseMovements({
        baseRows,
        rewardRows,
        productsById,
        usersById,
        salesById,
        rewardsById,
      });

    const hydratedRedemptions =
      hydrateMissingRedemptions({
        baseRows,
        rewardRows,
        productsById,
        usersById,
        salesById,
        rewardsById,
      });

    return sortMovementsByDate([
      ...hydratedMovements,
      ...hydratedRedemptions,
    ]);
  };