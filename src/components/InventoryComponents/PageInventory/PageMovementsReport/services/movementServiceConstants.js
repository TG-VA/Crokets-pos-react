export const POLI_BRANCH_ID = "412f367f-7c86-45ca-9e91-b8fe6274b232";

export const INVENTORY_MOVEMENTS_TABLE = "inventory_movements";

export const REWARD_REDEMPTIONS_TABLE = "sale_reward_redemptions";

// Tope de filas por respuesta de PostgREST (db-max-rows).
export const MOVEMENTS_PAGE_SIZE = 1000;

// Ids por consulta .in(): 200 UUID quedan muy por debajo del largo de URL.
export const IN_FILTER_BATCH_SIZE = 200;

export const MOVEMENTS_SALES_SELECT_KEY = "movementsReportSalesSelect_v5";

export const MOVEMENTS_PRODUCTS_SELECT_KEY = "movementsReportProductsSelect_v3";

export const MOVEMENTS_USERS_SELECT_KEY = "movementsReportUsersSelect_v1";

export const MOVEMENTS_SALE_DETAILS_SELECT_KEY =
  "movementsReportSaleDetailsSelect_v1";

export const MOVEMENTS_CANCELED_SALES_SELECT_KEY =
  "movementsReportCanceledSalesSelect_v1";

export const MOVEMENTS_SALE_RETURNS_SELECT_KEY =
  "movementsReportSaleReturnsSelect_v1";

export const MOVEMENTS_RETURN_ITEMS_SELECT_KEY =
  "movementsReportReturnItemsSelect_v1";

export const MOVEMENTS_REDEMPTIONS_SELECT_KEY =
  "movementsReportRedemptionsSelect_v1";

export const MOVEMENTS_REWARDS_SELECT_KEY = "movementsReportRewardsSelect_v1";
